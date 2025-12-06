#!/bin/bash

# Quick setup script to add hook deployment variables to .env

echo "Setting up .env for hook deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Check if POOL_MANAGER is already set
if grep -q "^POOL_MANAGER=" .env; then
    echo "✓ POOL_MANAGER already set"
else
    echo "Adding POOL_MANAGER to .env..."
    echo "" >> .env
    echo "# Hook Deployment" >> .env
    echo "POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28" >> .env
fi

# Check if ORACLE is already set
if grep -q "^ORACLE=" .env; then
    echo "✓ ORACLE already set"
else
    echo "Adding ORACLE to .env..."
    echo "ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D" >> .env
fi

# Check if HOOK_SALT is already set
if grep -q "^HOOK_SALT=" .env; then
    echo "✓ HOOK_SALT already set"
else
    echo "Adding HOOK_SALT placeholder to .env..."
    echo "HOOK_SALT=" >> .env
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PRIVATE_KEY and COSTON2_RPC are set in .env"
echo "2. Run: source .env"
echo "3. Run: forge script script/MineHookSalt.s.sol --rpc-url \$COSTON2_RPC"
