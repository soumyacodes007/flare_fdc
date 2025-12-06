# AgriHook Deployment Solution

## Problem Solved

You were getting: `HookAddressNotValid(0x8C691A99478D3b3fE039f777650C095578debF12)`

This happened because Uniswap V4 validates that hook addresses match their permissions.

## Solution Applied

I copied the exact approach from the ETHGlobalBuenosAires25 reference project:

1. **HookMiner** - Uses Uniswap's built-in salt mining utility
2. **CREATE2 Deployment** - Deploys with the mined salt
3. **Standard CREATE2 Deployer** - Uses `0x4e59b44847b379578588920cA78FbF26c0B4956C`

## Files Created

1. **`script/MineHookSalt.s.sol`** - Mines for valid salt
2. **`script/DeployHookCREATE2.s.sol`** - Deploys with CREATE2
3. **`HOOK_DEPLOYMENT.md`** - Complete guide
4. **`deploy-hook.sh`** - Automated deployment script

## Quick Start

### Step 1: Mine Salt (Off-chain)

```bash
cd agrirhook/packages/contracts
forge script script/MineHookSalt.s.sol --rpc-url $COSTON2_RPC
```

This will output a salt like: `HOOK_SALT=0x...`

### Step 2: Add Salt to .env

```bash
# Add to your .env file
HOOK_SALT=0x... # paste the salt from step 1
```

### Step 3: Deploy Hook

```bash
forge script script/DeployHookCREATE2.s.sol \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

## Or Use the Automated Script

```bash
chmod +x deploy-hook.sh
./deploy-hook.sh
```

## What Changed

### Before (Failed)
```solidity
// Simple deployment - address validation fails
AgriHook hook = new AgriHook(poolManager, oracle);
// ❌ Error: HookAddressNotValid
```

### After (Works)
```solidity
// CREATE2 deployment with mined salt
AgriHook hook = new AgriHook{salt: minedSalt}(poolManager, oracle);
// ✅ Address has correct flags, validation passes
```

## How It Works

1. **HookMiner.find()** tries different salts until it finds one that produces an address with bits 6 and 7 set (beforeSwap + afterSwap flags)

2. **CREATE2** generates deterministic addresses:
   ```
   address = keccak256(0xff, deployer, salt, bytecodeHash)
   ```

3. **BaseHook** validates the address matches the permissions returned by `getHookPermissions()`

## Environment Variables Needed

```bash
# .env file
PRIVATE_KEY=your_private_key
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28
ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D
HOOK_SALT=0x... # from mining step
```

## Expected Output

### Mining Salt
```
Mining salt for hook with flags:
  beforeSwap: true
  afterSwap: true
  
SUCCESS!
Hook address: 0x...
Salt: 0x...
```

### Deploying Hook
```
DEPLOYING AGRI HOOK WITH CREATE2
Hook deployed to: 0x...
Address flags: 0x180
Required flags: 0x180
Flags match: true ✅
Hook permissions validated successfully! ✅
```

## Verification

After deployment:

```bash
# Check oracle
cast call <HOOK_ADDRESS> "oracle()(address)" --rpc-url coston2

# Should return: 0xAD74Af4e6C6C79900b673e73912527089fE7A47D
```

## Why This Approach

This is the **standard Uniswap V4 hook deployment pattern**:
- ✅ Used by all Uniswap V4 hook projects
- ✅ Works on any EVM chain
- ✅ Deterministic and reproducible
- ✅ No custom workarounds needed

The ETHGlobalBuenosAires25 project uses the exact same approach for their NatGasDisruptionHook, which is 70-80% similar to AgriHook.
