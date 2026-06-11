#!/usr/bin/env bash
# scripts/start-speculos.sh
# ─────────────────────────────────────────────────────────────────────────────
# Starts the Speculos Ledger device emulator via Docker.
# Emulates a Nano X running the Ethereum app.
#
# Prerequisites:
#   - Docker installed and running
#   - An Ethereum app .elf file (download from github.com/LedgerHQ/app-ethereum/releases)
#
# Usage:
#   ./scripts/start-speculos.sh [path-to-eth-app.elf]
#
# Then open http://localhost:5000 in your browser to see the emulated device.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ELF="${1:-./apps/ethereum.elf}"
MODEL="${2:-nanosp}"          # nanosp | nanox | stax | flex
API_PORT=5000
APDU_PORT=9999

echo "╔══════════════════════════════════════════════════════╗"
echo "║              Starting Speculos Emulator               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Model:     $MODEL"
echo "  App:       $ELF"
echo "  UI URL:    http://localhost:$API_PORT"
echo "  APDU port: $APDU_PORT"
echo ""

if [ ! -f "$ELF" ]; then
  echo "⚠️  ELF file not found at: $ELF"
  echo ""
  echo "Download the Ethereum app ELF:"
  echo "  https://github.com/LedgerHQ/app-ethereum/releases"
  echo ""
  echo "Or run with Docker without a local ELF (uses bundled test apps):"
  echo ""
  echo "  docker run --rm -it \\"
  echo "    -p $API_PORT:5000 -p $APDU_PORT:9999 \\"
  echo "    ghcr.io/ledgerhq/speculos \\"
  echo "    --display headless --apdu-port 9999 \\"
  echo "    --model $MODEL apps/btc.elf"
  echo ""
  exit 1
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
  echo "🐳 Starting via Docker..."
  docker run --rm -it \
    -v "$(pwd)/apps:/apps" \
    -p "$API_PORT:5000" \
    -p "$APDU_PORT:9999" \
    ghcr.io/ledgerhq/speculos \
    --display headless \
    --apdu-port 9999 \
    --model "$MODEL" \
    "/apps/$(basename "$ELF")"
else
  # Try native pip install
  echo "🐍 Docker not found. Trying native speculos..."
  if ! command -v speculos &> /dev/null; then
    echo "Installing speculos..."
    pip install speculos
  fi
  speculos "$ELF" \
    --model "$MODEL" \
    --display headless \
    --api-port "$API_PORT" \
    --apdu-port "$APDU_PORT"
fi
