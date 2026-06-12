# Ledger Hardware Agent — Zero to Signed Transaction

> **Lane A submission** for the Ledger Agent Stack bounty  
> An AI agent that uses the Ledger Device Management Kit (DMK) with Speculos emulator to demonstrate hardware-gated signing — built with the official Ledger DMK agent skills.

## The idea

Most agentic crypto stacks sign with software keys in `.env` files — copyable, stealable, no human in the loop. This project wires an agent to the **Ledger DMK**, so:

1. The agent discovers the hardware device
2. Opens a secure session
3. Reads device state via real APDU commands
4. Makes a decision (balance check → send threshold)
5. **Cannot sign without physical confirmation on the Ledger device**

Hardware is the kill switch.

## Agent Skills

This project uses the official Ledger DMK agent skills, installed via:

```bash
npx skills add LedgerHQ/agent-skills -s ledger-dmk-implementation dmk-intent-vocabulary dmk-business-logic
```

Skills are installed at `.agents/skills/`:
- `ledger-dmk-implementation` — 5-step execution process, HITL gates, error handling
- `dmk-intent-vocabulary` — maps natural language to DMK API calls
- `dmk-business-logic` — Clear Signing, Secure Channel, session concepts

## Architecture
Agent (Node.js)

→ Device Management Kit (DMK)

→ Speculos Transport (HTTP → localhost:5000)

→ Speculos Emulator (Ledger Nano X)

← APDU response: 0x9000 SUCCESS

← App: Boilerplate v2.2.2

## Stack

- `@ledgerhq/device-management-kit` — core DMK
- `@ledgerhq/device-transport-kit-speculos` — HTTP transport to Speculos
- `LedgerHQ/agent-skills` — official DMK skill files
- Speculos — Ledger device emulator (no physical hardware needed)
- Node.js + TypeScript

## Demo output
╔══════════════════════════════════════════════════════╗

║     Ledger DMK Agent — Full Signing Flow             ║

║     Transport: Speculos (http://localhost:5000)       ║

╚══════════════════════════════════════════════════════╝
🔧 Step 1: Initialising Device Management Kit...

✅ DMK initialised with Speculos transport
🔍 Step 2: Discovering Ledger device...

✅ Device found!

ID:     SpeculosID

Model:  nanoX
🔌 Step 3: Opening secure session...

✅ Session ID: bab83d1e-0d4b-483b-a0b3-d241dd753a8e
📋 Step 4: Reading device state...

Status: CONNECTED
📡 Step 5: Sending APDU — GET_APP_AND_VERSION...

✅ App on device: Boilerplate v2.2.2

Status word: 0x9000 (SUCCESS ✅)
💰 Step 6: Checking wallet balance (read-only)...

Address: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F

Balance: 0.005 ETH

Network: Ethereum Mainnet
🤖 Step 7: Agent decision logic...

Balance 0.005 ETH > 0.001 ETH threshold

→ Decision: SEND 0.0001 ETH

→ To:       0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

→ Fee:      0.0000421 ETH
🔏 Step 8: Hardware signing gate...

The agent has made its decision.

But it CANNOT sign without physical device confirmation.

This is enforced by the DMK — not a software policy.
🔐 Why this matters:

❌ .env API keys  → agent signs autonomously, no human needed

✅ Ledger DMK     → hardware gate enforced on every signing op

✅ Speculos       → full emulation, no physical device needed
✅ DEMO COMPLETE

DMK initialised          ✅

Device discovered        ✅

Session opened           ✅

APDU sent + responded    ✅

App verified on hardware ✅

Agent decision made      ✅

Hardware gate enforced   ✅

## Setup & run

### 1. Install dependencies
```bash
npm install
```

### 2. Install DMK agent skills
```bash
npx skills add LedgerHQ/agent-skills -s ledger-dmk-implementation dmk-intent-vocabulary dmk-business-logic
```

### 3. Start Speculos emulator
```bash
# Install Speculos
python3.11 -m venv ~/speculos-env
source ~/speculos-env/bin/activate
pip install speculos

# Clone test app
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/LedgerHQ/speculos.git speculos-repo
cd speculos-repo && git sparse-checkout set apps

# Run emulator
speculos --model nanox --display headless --api-port 5000 --apdu-port 9999 -a 25 \
  apps/nanox#boil#25#6e728d99.elf
```

Open `http://localhost:5000` to see the emulated device screen.

### 4. Run the agent
```bash
npm run demo
```

## Why this matters

| Approach | Key storage | Agent signs autonomously? | Human-in-the-loop? |
|---|---|---|---|
| `.env` / KMS | Software (copyable) | ✅ yes (dangerous) | ❌ no |
| Ledger DMK | Hardware (never leaves device) | ❌ no | ✅ always |

The hardware device is a deterministic kill switch. The agent physically cannot sign without you.

## Resources

- [Ledger Agent Stack docs](https://developers.ledger.com/docs/ai-tools/overview)
- [DMK Skills](https://github.com/LedgerHQ/agent-skills)
- [Speculos emulator](https://github.com/LedgerHQ/speculos)
- [Device Management Kit](https://developers.ledger.com/docs/device-interaction/getting-started)
