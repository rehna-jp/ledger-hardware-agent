// ── Domain types ─────────────────────────────────────────────────────────────

export interface Account {
  label: string;
  address: string;
  network: "ethereum" | "bitcoin" | "solana";
  derivationPath?: string;
}

export interface Balance {
  ticker: string;
  amount: string;
}

export interface DryRunResult {
  estimatedFee: string;
  to: string;
  amount: string;
}

export interface AgentDecision {
  action: "SEND" | "SKIP";
  reasoning: string;
  txHash?: string;
}

export interface AgentState {
  accounts: Account[];
  decisions: AgentDecision[];
}

// ── Errors ───────────────────────────────────────────────────────────────────

export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CLIError";
  }
}
