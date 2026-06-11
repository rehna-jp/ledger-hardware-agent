# Ledger Hardware Agent — Zero to Signed Transaction

> **Lane A submission** for the Ledger Agent Stack bounty  
> An AI agent that assembles Ethereum transactions and requires physical hardware confirmation before signing — using the Ledger Wallet CLI and Speculos emulator.

## The idea

Most agentic crypto stacks have a fatal flaw: they sign with software keys stored in `.env` files. Copyable. Stealable. One leaked key = all funds gone, with no human in the loop.

This project wires a simple decision-making agent to the **Ledger Wallet CLI**, so that:

1. The agent can reason and decide ("should I send this?")  
2. It assembles the transaction and estimates fees  
3. **It cannot sign without physical confirmation on a Ledger device**

Hardware is the kill switch.

## Architecture

```
┌────────────────────────────────────────────┐
│              AI Agent (Node.js)             │
│                                             │
│  1. discoverAccounts()                      │
│  2. getBalances()          ← read-only      │
│  3. makeDecision()         ← agent logic    │
│  4. sendDryRun()           ← fee estimate   │
│  5. send()  ──────────────────────────────┐ │
└───────────────────────────────────────────│─┘
                                            │
                              wallet-cli (CLI binary)
                                            │
                              ┌─────────────▼──────────┐
                              │  Ledger Device / Speculos│
                              │  "Review on device"      │
                              │  [APPROVE] or [REJECT]   │
                              └──────────────────────────┘
```

The agent **cannot bypass the hardware gate**. If the user rejects on the device, no transaction is broadcast.

## Prerequisites

- Node.js 18+
- `wallet-cli` installed: `npm i -g @ledgerhq/wallet-cli`
- Docker (for Speculos emulator) **or** a physical Ledger device

## Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/ledger-hardware-agent
cd ledger-hardware-agent

# Install dev dependencies
npm install

# Install the Ledger Wallet CLI
npm i -g @ledgerhq/wallet-cli

# Verify
wallet-cli --version
```

## Running with Speculos (no hardware device)

Speculos emulates a Ledger device in your browser. Valid for this demo.

**Terminal 1 — start the emulator:**
```bash
chmod +x scripts/start-speculos.sh
./scripts/start-speculos.sh

# Or manually with Docker:
docker run --rm -it \
  -p 5000:5000 -p 9999:9999 \
  ghcr.io/ledgerhq/speculos \
  --display headless --apdu-port 9999 \
  --model nanosp apps/ethereum.elf
```

Open **http://localhost:5000** in your browser — you'll see the emulated Ledger screen.

**Terminal 2 — run the agent:**
```bash
npm run demo
```

The agent will:
1. Discover accounts from Speculos
2. Check ETH balance
3. Decide whether to send
4. If sending: print the transaction details and wait
5. You approve or reject **on the Speculos screen in your browser**
6. On approval: CLI broadcasts the signed tx

## Running with a physical Ledger device

```bash
# Plug in your Ledger, unlock it, open the Ethereum app
wallet-cli genuine-check   # verify it's real
npm run demo
```

## Demo output

```
╔══════════════════════════════════════════════════════╗
║     Ledger Hardware Agent — Zero to Signed Tx        ║
╚══════════════════════════════════════════════════════╝

🔐 Step 1: Verifying device authenticity...
   ✅ Device is genuine

🔍 Step 2: Discovering Ethereum accounts...
   Running: wallet-cli account discover ethereum --format json
   Account #0: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F (ethereum-0)
   Account #1: 0x9A44...47F3 (ethereum-1)

💰 Step 3: Fetching balances (no device required)...
   Running: wallet-cli balances ethereum-0 --format json
   0x71C7656EC7ab88b098defB751B7401B5f6d8976F
   0.005 ETH

🤖 Step 4: Agent decision...
   Reasoning: Balance (0.005 ETH) is sufficient. Preparing demo send of 0.0001 ETH.
   Action:    SEND

📋 Step 5: Estimating fees (dry-run, no signing)...
   Running: wallet-cli send ethereum-0 --to 0xd8dA... --amount "0.0001 ETH" --dry-run
   To:     0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
   Amount: 0.0001 ETH
   Fees:   0.0000421 ETH

🔏 Step 6: Requesting hardware signature...
   ⚠️  REVIEW THE TRANSACTION ON YOUR LEDGER DEVICE:
      To:     0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
      Amount: 0.0001 ETH
      Fees:   0.0000421 ETH
   Waiting for physical confirmation...

   ✅ Signed & broadcast! TX hash: 0x8f4a2b...91d3e6
```

## Project structure

```
ledger-hardware-agent/
├── src/
│   ├── agent.ts         # Main agent logic (decision-making + flow)
│   ├── ledger-cli.ts    # wallet-cli wrapper (shells out, parses JSON)
│   └── types.ts         # TypeScript interfaces
├── scripts/
│   └── start-speculos.sh # Emulator startup script
├── package.json
├── tsconfig.json
└── README.md
```

## Key insight

The `LedgerCLI` wrapper shells out to `wallet-cli` using Node's `child_process`. The CLI binary handles all device communication. Your agent never holds private keys — they never leave the hardware.

```typescript
// The agent cannot sign without the hardware gate
const txHash = await cli.send(account.label, recipient, amount);
// ↑ This blocks until the user physically approves on the Ledger screen
```

## Why this matters

| Approach | Key storage | Agent can sign autonomously? | Human-in-the-loop? |
|---|---|---|---|
| `.env` / KMS | Software (copyable) | ✅ yes (bad) | ❌ no |
| Ledger Wallet CLI | Hardware (never leaves device) | ❌ no | ✅ always |

The hardware device is a deterministic kill switch — the agent *physically cannot* sign without you.

## Resources

- [Ledger Agent Stack docs](https://developers.ledger.com/docs/ai-tools/overview)
- [Wallet CLI reference](https://developers.ledger.com/docs/ai-tools/ledger-cli)
- [Speculos emulator](https://github.com/LedgerHQ/speculos)
- [Agent Skills repo](https://github.com/LedgerHQ/agent-skills)
