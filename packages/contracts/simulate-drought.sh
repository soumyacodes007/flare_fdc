#!/bin/bash
# Simulate Drought Conditions on Coston2

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

# Default: Minas Gerais, Brazil (coffee region)
RAINFALL=${1:-0}  # 0 = severe drought
LATITUDE=${2:--18512200}  # -18.5122 * 1e6
LONGITUDE=${3:--44555000} # -44.555 * 1e6

echo "═══════════════════════════════════════════════════════"
echo "           SIMULATE DROUGHT CONDITIONS                "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📍 Oracle: $WEATHER_ORACLE_ADDRESS"
echo "🌧️  Rainfall: ${RAINFALL}mm"
echo "📍 Location: $(echo "scale=6; $LATITUDE / 1000000" | bc), $(echo "scale=6; $LONGITUDE / 1000000" | bc)"
echo ""

# Determine drought status
if [ "$RAINFALL" -eq 0 ]; then
    echo "🔴 Status: SEVERE DROUGHT (+50% price impact)"
elif [ "$RAINFALL" -lt 5 ]; then
    echo "🟠 Status: MODERATE DROUGHT (+30% price impact)"
elif [ "$RAINFALL" -lt 10 ]; then
    echo "🟡 Status: MILD DROUGHT (+15% price impact)"
else
    echo "🟢 Status: NORMAL CONDITIONS (no impact)"
fi
echo ""

# Get current state
echo "📊 Current weather event:"
cast call $WEATHER_ORACLE_ADDRESS \
    "getCurrentWeatherEvent()(uint8,int256,uint256,bool)" \
    --rpc-url $COSTON2_RPC

echo ""
echo "📝 Updating weather conditions..."
cast send $WEATHER_ORACLE_ADDRESS \
    "updateWeatherSimple(uint256,int256,int256)" \
    $RAINFALL $LATITUDE $LONGITUDE \
    --rpc-url $COSTON2_RPC \
    --private-key $PRIVATE_KEY \
    --legacy

echo ""
echo "✅ Weather updated!"
echo ""
echo "📊 New weather event:"
cast call $WEATHER_ORACLE_ADDRESS \
    "getCurrentWeatherEvent()(uint8,int256,uint256,bool)" \
    --rpc-url $COSTON2_RPC

echo ""
echo "💰 Theoretical price (with weather adjustment):"
cast call $WEATHER_ORACLE_ADDRESS \
    "getTheoreticalPrice()(uint256)" \
    --rpc-url $COSTON2_RPC
