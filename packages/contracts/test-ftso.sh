#!/bin/bash
# Test FTSO Integration on Coston2

set -e

source .env 2>/dev/null || true

if [ -z "$WEATHER_ORACLE_ADDRESS" ]; then
    echo "❌ WEATHER_ORACLE_ADDRESS not set"
    exit 1
fi

COSTON2_RPC=${COSTON2_RPC:-"https://coston2-api.flare.network/ext/C/rpc"}

echo "═══════════════════════════════════════════════════════"
echo "              FTSO INTEGRATION TEST                   "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📍 Oracle: $WEATHER_ORACLE_ADDRESS"
echo ""

# Check FTSO configuration
echo "⚙️  FTSO Configuration:"
echo -n "   Symbol: "
cast call $WEATHER_ORACLE_ADDRESS "ftsoSymbol()(string)" --rpc-url $COSTON2_RPC

echo -n "   Ratio: "
cast call $WEATHER_ORACLE_ADDRESS "ftsoToCoffeeRatio()(uint256)" --rpc-url $COSTON2_RPC

echo -n "   Enabled: "
cast call $WEATHER_ORACLE_ADDRESS "useFTSO()(bool)" --rpc-url $COSTON2_RPC

echo ""
echo "💰 Current Prices:"
echo -n "   Base Price: "
cast call $WEATHER_ORACLE_ADDRESS "basePrice()(uint256)" --rpc-url $COSTON2_RPC

echo -n "   Theoretical: "
cast call $WEATHER_ORACLE_ADDRESS "getTheoreticalPrice()(uint256)" --rpc-url $COSTON2_RPC

echo ""
echo "🌤️  Weather Event:"
cast call $WEATHER_ORACLE_ADDRESS \
    "getCurrentWeatherEvent()(uint8,int256,uint256,bool)" \
    --rpc-url $COSTON2_RPC

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 To update price from FTSO:"
echo "   cast send $WEATHER_ORACLE_ADDRESS \"updatePriceFromFTSO()\" --rpc-url \$COSTON2_RPC --private-key \$PRIVATE_KEY --legacy"
echo ""
echo "📝 To configure FTSO:"
echo "   cast send $WEATHER_ORACLE_ADDRESS \"configureFTSO(string,uint256,bool)\" \"BTC\" 10000 true --rpc-url \$COSTON2_RPC --private-key \$PRIVATE_KEY --legacy"
