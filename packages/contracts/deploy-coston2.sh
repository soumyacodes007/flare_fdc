#!/bin/bash
# Deploy all contracts to Flare Coston2 Testnet

set -e

echo "═══════════════════════════════════════════════════════"
echo "    AGRI-HOOK DEPLOYMENT TO FLARE COSTON2 TESTNET     "
echo "═══════════════════════════════════════════════════════"
echo ""

# Load environment
source .env 2>/dev/null || true

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$COSTON2_RPC" ]; then
    export COSTON2_RPC="https://coston2-api.flare.network/ext/C/rpc"
fi

echo "📍 Network: Coston2 Testnet"
echo "🔗 RPC: $COSTON2_RPC"
echo ""

# Deploy
echo "🚀 Deploying contracts..."
forge script script/DeployCoston2.s.sol:DeployCoston2 \
    --rpc-url $COSTON2_RPC \
    --broadcast \
    --legacy \
    -vvv

echo ""
echo "═══════════════════════════════════════════════════════"
echo "                 DEPLOYMENT COMPLETE                   "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with deployed addresses"
echo "   2. Test FTSO: npx ts-node scripts/ftso-integration/update-price-ftso.ts status"
echo "   3. Test FDC:  npx ts-node scripts/fdc-integration/test-weather-api.ts"
echo ""
