#!/bin/bash

# =================================================================
# AGRI-HOOK DEPLOYMENT TO BASE MAINNET
# =================================================================
# This script deploys the full AgriHook system to Base Mainnet
# where Uniswap V4 is officially deployed.
# =================================================================

set -e

# Load environment variables
source .env

echo "================================================================="
echo "AGRI-HOOK BASE MAINNET DEPLOYMENT"
echo "================================================================="
echo ""

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

echo "✅ Environment loaded"
echo ""

# =================================================================
# STEP 1: Mine Hook Salt (if needed)
# =================================================================
echo "STEP 1: Checking hook salt..."
echo "-----------------------------------------------------------------"

if [ -z "$HOOK_SALT_BASE" ]; then
    echo "⚠️  HOOK_SALT_BASE not set. Mining new salt..."
    echo "   This may take a few minutes..."
    
    # Run salt mining script
    forge script script/MineHookSalt.s.sol -vvv
    
    echo ""
    echo "❌ Please add the mined salt to .env as HOOK_SALT_BASE and re-run"
    exit 1
else
    echo "✅ Hook salt found: $HOOK_SALT_BASE"
fi
echo ""

# =================================================================
# STEP 2: Deploy Contracts
# =================================================================
echo "STEP 2: Deploying contracts to Base Mainnet..."
echo "-----------------------------------------------------------------"

forge script script/DeployBaseMainnet.s.sol \
    --rpc-url base \
    --private-key $PRIVATE_KEY \
    --broadcast \
    -vvv

echo ""
echo "✅ Contracts deployed!"
echo ""

# =================================================================
# STEP 3: Initialize Pool
# =================================================================
echo "STEP 3: Initializing COFFEE/FBTC pool..."
echo "-----------------------------------------------------------------"

# Wait for user to update .env with deployed addresses
echo "⚠️  Please update .env with the deployed addresses:"
echo "   COFFEE_ADDRESS_BASE=<address>"
echo "   FBTC_ADDRESS_BASE=<address>"
echo "   WEATHER_ORACLE_BASE=<address>"
echo "   HOOK_ADDRESS_BASE=<address>"
echo ""
read -p "Press Enter after updating .env..."

# Reload environment
source .env

forge script script/InitPoolBase.s.sol \
    --rpc-url base \
    --private-key $PRIVATE_KEY \
    --broadcast \
    -vvv

echo ""
echo "✅ Pool initialized!"
echo ""

# =================================================================
# STEP 4: Add Liquidity
# =================================================================
echo "STEP 4: Adding liquidity to pool..."
echo "-----------------------------------------------------------------"

forge script script/AddLiquidityBase.s.sol \
    --rpc-url base \
    --private-key $PRIVATE_KEY \
    --broadcast \
    -vvv

echo ""
echo "✅ Liquidity added!"
echo ""

# =================================================================
# STEP 5: Test Swap
# =================================================================
echo "STEP 5: Testing swap..."
echo "-----------------------------------------------------------------"

forge script script/TestSwapBase.s.sol \
    --rpc-url base \
    --private-key $PRIVATE_KEY \
    --broadcast \
    -vvv

echo ""
echo "================================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================================="
echo ""
echo "All contracts deployed and tested on Base Mainnet."
echo "Check BaseScan for transaction details."
echo ""
