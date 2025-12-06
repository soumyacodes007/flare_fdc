# Complete Deployment Instructions

## Issue Found
The previous deployment showed addresses but contracts didn't actually deploy (returned 0x bytecode).

## Solution: Deploy with --legacy flag

Coston2 doesn't support EIP-3855, so we need to use `--legacy` flag.

## Step-by-Step Deployment

### 1. Clean Previous Attempts
```bash
cd agrirhook/packages/contracts
forge clean
```

### 2. Deploy All Contracts (Except Hook)
```bash
forge script script/DeployAllCoston2.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy \
  --slow
```

This will deploy:
- MockFBTC
- CoffeeToken
- WeatherOracleWithFTSO
- InsuranceVault
- MockPoolManager
- (Hook will fail, that's expected)

### 3. Verify Oracle Deployed
```bash
# Check if oracle has code
cast code <ORACLE_ADDRESS> --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Should return bytecode, not 0x
```

### 4. Update .env with Real Addresses
Copy the deployed addresses from the output to your `.env`:
```bash
POOL_MANAGER=<deployed_address>
ORACLE=<deployed_address>
```

### 5. Mine Hook Salt
```bash
forge script script/MineHookSalt.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --legacy
```

Copy the salt to `.env`:
```bash
HOOK_SALT=<mined_salt>
```

### 6. Deploy Hook with CREATE2
```bash
forge script script/DeployHookCREATE2.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy \
  --slow
```

### 7. Verify Everything
```bash
# Check all contracts have code
cast code $ORACLE --rpc-url https://coston2-api.flare.network/ext/C/rpc
cast code $AGRI_HOOK_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
cast code $INSURANCE_VAULT_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## Troubleshooting

### If deployment still fails:
1. Check you have enough CFLR (need ~5 CFLR)
2. Try with `--slow` flag (adds delay between transactions)
3. Check gas price: `cast gas-price --rpc-url https://coston2-api.flare.network/ext/C/rpc`

### If out of gas:
Add `--gas-limit 10000000` to the forge script command

### If nonce issues:
```bash
# Check your nonce
cast nonce $YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## Expected Output

After successful deployment, you should see:
```
MockFBTC: 0x...
CoffeeToken: 0x...
WeatherOracleWithFTSO: 0x...
InsuranceVault: 0x...
MockPoolManager: 0x...
AgriHook: 0x...
```

All addresses should return bytecode when checked with `cast code`.
