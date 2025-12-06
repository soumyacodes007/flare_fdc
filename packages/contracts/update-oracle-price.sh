#!/bin/bash
# Update Oracle Price on Coston2

set -e

source .env 2>/dev/null || true

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$WEATHER_ORACLE_ADDRESS" ]; then
    echo "❌ WEATHER_ORACLE_ADDRESS not set"
    exit 1
fi

COSTON2_RPC=${COSTON2_RPC:-"https://coston2-api.flare.network/ext/C/rpc"}
NEW_PRICE=${NEW_PRICE:-"5000000000000000000"} # 5 FBTC (18 decimals)

echo "═══════════════════════════════════════════════════════"
echo "           UPDATE ORACLE PRICE (COSTON2)              "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📍 Oracle: $WEATHER_ORACLE_ADDRESS"
echo "💰 New Price: $NEW_PRICE (raw)"
echo ""

# Get current price
echo "📊 Current price:"
cast call $WEATHER_ORACLE_ADDRESS "basePrice()(uint256)" --rpc-url $COSTON2_RPC

echo ""
echo "📝 Updating price..."
cast send $WEATHER_ORACLE_ADDRESS \
    "updateBasePrice(uint256)" \
    $NEW_PRICE \
    --rpc-url $COSTON2_RPC \
    --private-key $PRIVATE_KEY \
    --legacy

echo ""
echo "✅ Price updated!"
echo ""
echo "📊 New price:"
cast call $WEATHER_ORACLE_ADDRESS "basePrice()(uint256)" --rpc-url $COSTON2_RPC
