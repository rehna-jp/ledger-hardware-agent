/**
 * LedgerCLI — Node.js wrapper around the @ledgerhq/wallet-cli binary
 *
 * The Ledger Wallet CLI is a terminal binary, not a JS SDK.
 * This class shells out to it using child_process and parses JSON output.
 *
 * All signing commands pause and wait for physical hardware confirmation.
 */

import { execSync, spawnSync } from "child_process";
import {
  Account,
  Balance,
  DryRunResult,
  CLIError,
} from "./types.js";

export class LedgerCLI {
  private readonly bin: string;
  private readonly timeout: number;

  constructor(
    bin = "wallet-cli",
    timeoutMs = 120_000 // 2 min — hardware confirmation can take a moment
  ) {
    this.bin = bin;
    this.timeout = timeoutMs;
    this.assertCLIInstalled();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private assertCLIInstalled() {
    try {
      execSync(`${this.bin} --version`, { stdio: "pipe" });
    } catch {
      throw new CLIError(
        `wallet-cli not found. Install it with:\n  npm i -g @ledgerhq/wallet-cli`
      );
    }
  }

  /**
   * Run a wallet-cli command, return parsed JSON output.
   * Throws CLIError on non-zero exit or unparseable output.
   */
  private run(args: string[], expectJson = true): any {
    const fullArgs = expectJson ? [...args, "--format", "json"] : args;
    const result = spawnSync(this.bin, fullArgs, {
      encoding: "utf8",
      timeout: this.timeout,
      stdio: ["inherit", "pipe", "pipe"], // inherit stdin so hardware prompts work
    });

    if (result.error) throw new CLIError(`Spawn error: ${result.error.message}`);

    // wallet-cli prints human-readable lines + JSON at the end
    const stdout = result.stdout?.trim() ?? "";
    const stderr = result.stderr?.trim() ?? "";

    if (result.status !== 0) {
      // Check for user rejection
      const combined = stdout + stderr;
      if (combined.toLowerCase().includes("reject")) {
        throw new CLIError("Transaction rejected on device");
      }
      throw new CLIError(`wallet-cli exited ${result.status}: ${stderr || stdout}`);
    }

    if (!expectJson) return stdout;

    // Extract JSON block from output (wallet-cli may prefix with status lines)
    const jsonMatch = stdout.match(/(\[.*\]|\{.*\})/s);
    if (!jsonMatch) {
      // Some commands return plain text even with --format json
      return { raw: stdout };
    }

    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      return { raw: stdout };
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Verify the Ledger device is genuine.
   * Throws if the check fails.
   */
  async genuineCheck(): Promise<void> {
    const result = this.run(["genuine-check"], false);
    if (result.toLowerCase().includes("not genuine")) {
      throw new CLIError("Device failed genuine check");
    }
  }

  /**
   * Discover accounts for a given network.
   * Requires the device to be connected and unlocked with the right app open.
   */
  async discoverAccounts(
    network: "ethereum" | "bitcoin" | "solana"
  ): Promise<Account[]> {
    console.log(`   Running: ${this.bin} account discover ${network} --format json`);
    const raw = this.run(["account", "discover", network]);

    // Normalize to Account[]
    if (Array.isArray(raw)) {
      return raw.map((a: any, i: number) => ({
        label: a.label ?? a.name ?? `${network}-${i + 1}`,
        address: a.address ?? a.xpub ?? a.publicKey ?? "(unknown)",
        network,
        derivationPath: a.derivationPath ?? a.path,
      }));
    }

    // Fallback: parse plain-text output like "ethereum:main account #0 0x71C7…976F"
    const lines: Account[] = [];
    const text = raw.raw ?? "";
    const lineRegex = /account\s+#(\d+)\s+(0x[a-fA-F0-9]{4,}|[a-zA-Z0-9]{30,})/gi;
    let match;
    while ((match = lineRegex.exec(text)) !== null) {
      lines.push({
        label: `${network}-${match[1]}`,
        address: match[2],
        network,
      });
    }
    return lines;
  }

  /**
   * Get balances for a discovered account.
   * Read-only — no device required.
   */
  async getBalances(accountLabel: string): Promise<Balance[]> {
    console.log(`   Running: ${this.bin} balances ${accountLabel} --format json`);
    const raw = this.run(["balances", accountLabel]);

    if (Array.isArray(raw)) {
      return raw.map((b: any) => ({
        ticker: b.ticker ?? b.symbol ?? "???",
        amount: String(b.amount ?? b.value ?? "0"),
      }));
    }

    // Parse plain-text: "1.5 ETH\n100 USDT"
    const text = raw.raw ?? "";
    return text
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((line: string) => {
        const parts = line.split(/\s+/);
        return { amount: parts[0] ?? "0", ticker: parts[1] ?? "???" };
      });
  }

  /**
   * Dry-run a send — estimates fees without touching the device.
   */
  async sendDryRun(
    fromLabel: string,
    to: string,
    amount: string
  ): Promise<DryRunResult> {
    console.log(
      `   Running: ${this.bin} send ${fromLabel} --to ${to} --amount "${amount}" --dry-run --format json`
    );
    const raw = this.run([
      "send",
      fromLabel,
      "--to",
      to,
      "--amount",
      amount,
      "--dry-run",
    ]);

    return {
      estimatedFee: raw.fees ?? raw.estimatedFee ?? raw.fee ?? "unknown",
      to: raw.to ?? to,
      amount: raw.amount ?? amount,
    };
  }

  /**
   * Sign and broadcast a transaction.
   * This WILL pause for physical hardware confirmation on the Ledger device.
   * Returns the transaction hash on success.
   */
  async send(fromLabel: string, to: string, amount: string): Promise<string> {
    console.log(
      `   Running: ${this.bin} send ${fromLabel} --to ${to} --amount "${amount}" --format json`
    );

    // Note: NO --dry-run here — this is the real signing call
    const raw = this.run(["send", fromLabel, "--to", to, "--amount", amount]);

    const hash =
      raw.txHash ??
      raw.hash ??
      raw.transactionHash ??
      raw.raw?.match(/0x[a-fA-F0-9]{64}/)?.[0];

    if (!hash) {
      throw new CLIError(`Send completed but no tx hash found in output: ${JSON.stringify(raw)}`);
    }

    return hash;
  }

  /**
   * View the current session (discovered accounts cache).
   */
  async sessionView(): Promise<string> {
    return this.run(["session", "view"], false);
  }

  /**
   * Reset the session (clears cached account data).
   */
  async sessionReset(): Promise<void> {
    this.run(["session", "reset"], false);
  }
}
