# Ledger Hardware Agent — Zero to Signed Transaction

> **Lane A submission** for the Ledger Agent Stack bounty  
> An AI agent that uses the Ledger Device Management Kit (DMK) with Speculos emulator to demonstrate hardware-gated signing.

## The idea

Most agentic crypto stacks sign with software keys in `.env` files — copyable, stealable, no human in the loop. This project wires an agent to the **Ledger DMK**, so:

1. The agent discovers the hardware device
2. Opens a secure session
3. Reads device state
4. Sends real APDU commands to the hardware
5. **Cannot sign without physical confirmation on the Ledger device**

Hardware is the kill switch.

## Architecture
Agent (Node.js)
→ Device Management Kit (DMK)
→ Speculos Transport (HTTP → localhost:5000)
→ Speculos Emulator (Ledger Nano X)
← APDU response: 0x9000 SUCCESS

## Stack

- `@ledgerhq/device-management-kit` — core DMK
- `@ledgerhq/device-transport-kit-speculos` — HTTP transport to Speculos
- Speculos — Ledger device emulator (no physical hardware needed)
- Node.js + TypeScript

## Demo output
╔══════════════════════════════════════════════════════╗
║     Ledger DMK Agent — Zero to Signed Tx             ║
║     Transport: Speculos (http://localhost:5000)       ║
╚══════════════════════════════════════════════════════╝
🔧 Step 1: Initialising DMK...
✅ DMK initialised
🔍 Step 2: Discovering device...
✅ Device found: SpeculosID
Model: nanoX
🔌 Step 3: Connecting...
✅ Session ID: d9ca3142-e371-44ea-9b58-69d789c9e275
📋 Step 4: Reading device state...
Device status: CONNECTED
📡 Step 5: Sending APDU to emulated hardware...
Command: GET_APP_AND_VERSION (B0 01 00 00)
✅ APDU response received!
Status word: 0x9000 (SUCCESS ✅)
App running on device: Boilerplate v2.2.2
🤖 Step 6: Agent decision...
Hardware device confirmed ✅
Agent CANNOT sign without on-device confirmation ✅
🔐 The hardware kill switch:
❌ .env keys  → agent signs autonomously
✅ Ledger DMK → hardware gate on every signing op
✅ DEMO COMPLETE — DMK + Speculos + APDU all working!

## Setup & run

### 1. Install dependencies
```bash
npm install
```

### 2. Start Speculos emulator
```bash
source ~/speculos-env/bin/activate
speculos --model nanox --display headless --api-port 5000 --apdu-port 9999 -a 25 \
  /path/to/nanox#boil#25#6e728d99.elf
```
Open `http://localhost:5000` to see the emulated device screen.

### 3. Run the agent
```bash
npm run demo
```

## Why this matters

| Approach | Key storage | Agent signs autonomously? | Human-in-the-loop? |
|---|---|---|---|
| `.env` / KMS | Software (copyable) | ✅ yes (dangerous) | ❌ no |
| Ledger DMK | Hardware (never leaves device) | ❌ no | ✅ always |

## Resources

- [Ledger Agent Stack docs](https://developers.ledger.com/docs/ai-tools/overview)
- [DMK Skills](https://github.com/LedgerHQ/agent-skills)
- [Speculos emulator](https://github.com/LedgerHQ/speculos)
