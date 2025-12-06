# AgriHook Deployment with CREATE2

This guide shows how to deploy AgriHook with proper address validation using CREATE2.

## Prerequisites

1. Deployed contracts:
   - WeatherOracle: `0xAD74Af4e6C6C79900b673e73912527089fE7A47D`
   - InsuranceVault: `0x96fe78279FAf7A13aa28Dbf95372C6211DfE5d4a`
   - MockPoolManager: `0xC16f97862fD62f9304c68065813a6514EcFC1d28`

2. Environment variables in `.env`:
   ```bash
   PRIVATE_KEY=your_private_key
   COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
   POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28
   ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D
   ```

## Step 1: Mine for Valid Salt

This finds a salt that produces a hook address with the correct permission flags.

```bash
forge script script/MineHookSalt.s.sol --rpc-url $COSTON2_RPC
```

**Output:**
```
Mining salt for hook with flags:
  beforeSwap: true
  afterSwap: true
  
SUCCESS!
Hook address: 0x...
Salt: 0x...

Add to your .env file:
  HOOK_SALT=0x...
```

**Copy the salt to your `.env` file:**
```bash
HOOK_SALT=0x... # paste the salt from output
```

## Step 2: Deploy Hook with CREATE2

Now deploy using the mined salt:

```bash
forge script script/DeployHookCREATE2.s.sol \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

**Output:**
```
DEPLOYING AGRI HOOK WITH CREATE2
Hook deployed to: 0x...
Address flags: 0x180
Required flags: 0x180
Flags match: true
Hook permissions validated successfully!
```

## Step 3: Verify Deployment

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

## How It Works

### CREATE2 Deployment
- Uses the standard CREATE2 deployer at `0x4e59b44847b379578588920cA78FbF26c0B4956C`
- This deployer exists on all EVM chains at the same address
- Allows deterministic address generation based on salt

### Hook Address Validation
Uniswap V4 requires hook addresses to have specific bits set:
- **beforeSwap**: bit 6
- **afterSwap**: bit 7
- Combined flags: `0x180` (384 in decimal)

The HookMiner finds a salt that produces an address with these exact bits set.

### Why This Works
1. CREATE2 generates addresses deterministically: `keccak256(0xff, deployer, salt, bytecodeHash)`
2. HookMiner tries different salts until it finds one that produces a valid address
3. The same salt will always produce the same address
4. BaseHook's constructor validates the address matches the permissions

## Troubleshooting

### "POOL_MANAGER not set"
Add to `.env`: `POOL_MANAGER=0xC16f97862fD62f9304c68065813a6514EcFC1d28`

### "ORACLE not set"
Add to `.env`: `ORACLE=0xAD74Af4e6C6C79900b673e73912527089fE7A47D`

### "HOOK_SALT not set"
Run Step 1 first to mine a salt, then add it to `.env`

### "Hook address does not have correct flags"
The salt mining failed or was corrupted. Re-run Step 1 to get a new salt.

## Architecture

```
┌─────────────────┐
│ WeatherOracle   │ (0xAD74...)
└────────┬────────┘
         │
         ├──────────────┐
         │              │
┌────────▼────────┐ ┌──▼──────────────┐
│ AgriHook        │ │ InsuranceVault  │ (0x96fe...)
│ (NEW!)          │ │                 │
└─────────────────┘ └─────────────────┘
         │
         │
┌────────▼────────┐
│ MockPoolManager │ (0xC16f...)
└─────────────────┘
```

Both AgriHook and InsuranceVault are independent - they both use WeatherOracle but don't directly interact.
