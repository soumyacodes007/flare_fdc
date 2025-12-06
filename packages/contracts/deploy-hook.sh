#!/bin/bash

# AgriHook Deployment Script
# This script mines a salt and deploys AgriHook with CREATE2

set -e

echo "==================================================================="
echo "AGRI HOOK DEPLOYMENT"
echo "==================================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create .env with:"
    echo "  PRIVATE_KEY=..."
    echo "  COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc"
    echo "  POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28"
    echo "  ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D"
    exit 1
fi

# Load environment variables
source .env

# Check if HOOK_SALT is already set
if [ -z "$HOOK_SALT" ]; then
    echo "Step 1: Mining salt for valid hook address..."
    echo "-------------------------------------------------------------------"
    forge script script/MineHookSalt.s.sol --rpc-url $COSTON2_RPC
    echo ""
    echo "Please add the HOOK_SALT to your .env file and run this script again"
    exit 0
fi

echo "Step 2: Deploying AgriHook with CREATE2..."
echo "-------------------------------------------------------------------"
echo "Using salt: $HOOK_SALT"
echo ""

forge script script/DeployHookCREATE2.s.sol \
    --rpc-url $COSTON2_RPC \
    --broadcast \
    --private-key $PRIVATE_KEY

echo ""
echo "==================================================================="
echo "DEPLOYMENT COMPLETE!"
echo "==================================================================="
