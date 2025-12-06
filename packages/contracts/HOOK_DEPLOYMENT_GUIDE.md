# AgriHook Deployment Guide

## Problem
Uniswap V4 hooks require specific address prefixes that match their permission flags. The hook address must have specific bits set based on which hook functions are implemented.

## Solution
We created a deployment system that:
1. Uses CREATE2 for deterministic address generation
2. Mines for a valid salt that produces an address with correct flags
3. Deploys through a HookDeployer contract

## Files Created

### 1. `src/HookDeployer.sol`
Helper contract that deploys AgriHook with CREATE2 using a specific salt.

### 2. `script/DeployHookOnly.s.sol`
Deployment script that:
- Deploys MockPoolManager
- Deploys HookDeployer
- Mines for a valid salt (checks up to 100,000 salts)
- Deploys AgriHook with the valid salt

## Hook Permissions
AgriHook implements:
- `beforeSwap` (bit 7)
- `afterSwap` (bit 8)

The deployed address must have these bits set in the lower 14 bits.

## Deployment Command

```bash
forge script script/DeployHookOnly.s.sol:DeployHookOnly \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --rpc-url $COSTON2_RPC
```

## Expected Output

```
STEP 1: DEPLOYING MOCK POOL MANAGER
MockPoolManager deployed at: 0x...

STEP 2: DEPLOYING HOOK DEPLOYER
HookDeployer deployed at: 0x...

STEP 3: MINING FOR VALID HOOK ADDRESS
Mining for valid hook address...
Required flags: beforeSwap (bit 7) + afterSwap (bit 8)
Salt found after X attempts
Found valid salt: 0x...

STEP 4: DEPLOYING AGRI HOOK
Predicted hook address: 0x...
AgriHook deployed at: 0x...
Hook address validation: PASSED
```

## Existing Contracts (Not Redeployed)

- **WeatherOracle**: `0xAD74Af4e6C6C79900b673e73912527089fE7A47D`
- **InsuranceVault**: `0x96fe78279FAf7A13aa28Dbf95372C6211DfE5d4a`

## Architecture Notes

AgriHook and InsuranceVault are **independent contracts**:
- **AgriHook**: Manages Uniswap V4 pool fees and bonuses based on weather data
- **InsuranceVault**: Manages farmer insurance policies and payouts
- **Both** use WeatherOracle for weather data
- **No direct connection** needed between Hook and Vault

## Verification Commands

After deployment, verify the hook:

```bash
# Check hook's oracle
cast call <HOOK_ADDRESS> "oracle()(address)" --rpc-url coston2

# Check cached price
cast call <HOOK_ADDRESS> "cachedOraclePrice()(uint256)" --rpc-url coston2

# Update price from oracle
cast send <HOOK_ADDRESS> "updatePriceFromOracle(uint256,uint256)" \
  5000000000000000000 $(date +%s) \
  --rpc-url coston2 --private-key $PRIVATE_KEY
```

## Troubleshooting

### "HookAddressNotValid" Error
This means the deployed address doesn't have the correct permission flags. The script mines for a valid salt to prevent this.

### "Could not find valid salt"
If mining fails after 100,000 attempts, try:
1. Increasing the max attempts in the script
2. Using a different deployer address
3. Checking that the hook permissions are correctly defined

### Mining Takes Too Long
The mining process is probabilistic. On average, it should find a valid salt within a few thousand attempts. If it's taking too long, the script shows progress every 10,000 attempts.
