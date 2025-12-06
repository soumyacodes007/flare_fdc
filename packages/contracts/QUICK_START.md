# Quick Start: Deploy AgriHook

## Step 1: Setup Environment

```bash
cd agrirhook/packages/contracts

# Option A: Manual setup
# Edit .env and add these lines:
POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28
ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D

# Option B: Automated setup
chmod +x setup-env.sh
./setup-env.sh
```

Make sure your `.env` has:
```bash
PRIVATE_KEY=your_private_key
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28
ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D
```

## Step 2: Load Environment

```bash
source .env
```

Or on Windows:
```bash
# PowerShell
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
```

## Step 3: Mine Salt (No Gas Cost)

```bash
forge script script/MineHookSalt.s.sol --rpc-url $COSTON2_RPC
```

**Important:** 
- ❌ Don't use `--broadcast` (no transaction needed)
- ❌ Don't use `--private-key` (just simulation)

**Output will show:**
```
SUCCESS!
Hook address: 0x...
Salt: 0x...

Add to your .env file:
  HOOK_SALT=0x...
```

## Step 4: Add Salt to .env

Copy the salt from the output and add to `.env`:
```bash
HOOK_SALT=0x... # paste the salt here
```

Then reload:
```bash
source .env
```

## Step 5: Deploy Hook (Costs Gas)

```bash
forge script script/DeployHookCREATE2.s.sol \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

**Output will show:**
```
DEPLOYMENT SUCCESSFUL!
Hook deployed to: 0x...
Address flags: 0x180
Required flags: 0x180
Flags match: true ✅
```

## Step 6: Verify

```bash
# Check oracle address
cast call <HOOK_ADDRESS> "oracle()(address)" --rpc-url $COSTON2_RPC

# Should return: 0xAD74Af4e6C6C79900b673e73912527089fE7A47D
```

## Troubleshooting

### "POOL_MANAGER not set"
```bash
# Add to .env
POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28

# Reload
source .env
```

### "ORACLE not set"
```bash
# Add to .env
ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D

# Reload
source .env
```

### "HOOK_SALT not set"
Run Step 3 first to mine a salt, then add it to .env

### Environment variables not loading
Make sure to run `source .env` after editing the file

## Summary

```bash
# 1. Setup
echo "POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28" >> .env
echo "ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D" >> .env
source .env

# 2. Mine salt (no gas)
forge script script/MineHookSalt.s.sol --rpc-url $COSTON2_RPC

# 3. Add salt to .env
echo "HOOK_SALT=0x..." >> .env  # paste from output
source .env

# 4. Deploy (costs gas)
forge script script/DeployHookCREATE2.s.sol \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Done! Your AgriHook is deployed with proper address validation.
