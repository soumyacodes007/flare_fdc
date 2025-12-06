# Agri-Hook Deployment Guide - Flare Coston2

## Quick Deploy

### Prerequisites

1. **Get Coston2 CFLR**
   ```bash
   # Visit faucet
   https://faucet.flare.network/
   # Select "Coston2 Testnet"
   # Enter your wallet address
   ```

2. **Set Environment Variables**
   ```bash
   cd ETHGlobalBuenosAires25/packages/contracts
   
   # Create .env file
   echo "PRIVATE_KEY=your_private_key_here" > .env
   echo "COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc" >> .env
   ```

### Deploy All Contracts

```bash
# Deploy to Coston2
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --verify \
  -vvvv

# Or use the RPC URL directly
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast \
  -vvvv
```

## What Gets Deployed

The script deploys in this order:

### 1. Tokens
- **MockFBTC** - FAsset Bitcoin (18 decimals)
  - Mints 1,000,000 FBTC to deployer
- **CoffeeToken** - Tokenized coffee harvest
  - Initial supply: 100,000 COFFEE

### 2. WeatherOracleWithFTSO
- Integrates with Flare FTSO for real-time prices
- Uses BTC as proxy asset (1 BTC = 10,000 bags of coffee)
- Automatically fetches initial price from FTSO
- Supports FDC weather attestations

### 3. InsuranceVault
- Manages farmer insurance policies
- Funded with 10 CFLR initial treasury
- Connected to WeatherOracleWithFTSO

### 4. AgriHook (Optional)
- Uniswap V4 hook for dynamic fees
- Only deploys if PoolManager address is set
- Requires Uniswap V4 deployment on Coston2

## After Deployment

### Copy Contract Addresses

The script outputs all addresses in a frontend-ready format:

```bash
NEXT_PUBLIC_FBTC_ADDRESS=0x...
NEXT_PUBLIC_COFFEE_ADDRESS=0x...
NEXT_PUBLIC_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_FTSO_REGISTRY=0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
NEXT_PUBLIC_FDC_VERIFICATION=0x89D20A10a3014B2023023F01d9337583B9273c52
```

### Test FTSO Integration

```bash
# Check available FTSO symbols
cast call $ORACLE_ADDRESS \
  "getAvailableFTSOSymbols()(string[])" \
  --rpc-url coston2

# Update price from FTSO
cast send $ORACLE_ADDRESS \
  "updatePriceFromFTSO()" \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# Check current price
cast call $ORACLE_ADDRESS \
  "basePrice()(uint256)" \
  --rpc-url coston2

# Get current FTSO price
cast call $ORACLE_ADDRESS \
  "getCurrentFTSOPrice()(uint256,uint256,uint256)" \
  --rpc-url coston2
```

### Test Insurance Flow

```bash
# 1. Get test FBTC
cast send $FBTC_ADDRESS \
  "mint(address,uint256)" \
  $YOUR_ADDRESS \
  1000000000000000000000 \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# 2. Create insurance policy
# Coverage: 5000 USDC (5000000000 in 6 decimals)
# Location: Minas Gerais, Brazil (-18.5122, -44.555)
cast send $VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 \
  -44555000 \
  5000000000 \
  --value 1ether \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# 3. Check policy
cast call $VAULT_ADDRESS \
  "getPolicy(address)(int256,int256,bytes32,uint256,uint256,uint256,uint256,bool,bool)" \
  $YOUR_ADDRESS \
  --rpc-url coston2

# 4. Simulate drought (0mm rainfall)
cast send $ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 \
  -18512200 \
  -44555000 \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# 5. Check weather event
cast call $ORACLE_ADDRESS \
  "getCurrentWeatherEvent()(uint8,int256,uint256,bool)" \
  --rpc-url coston2

# 6. Claim payout
cast send $VAULT_ADDRESS \
  "claimPayout()" \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# 7. Check vault stats
cast call $VAULT_ADDRESS \
  "getVaultStats()(uint256,uint256,uint256,uint256,uint256)" \
  --rpc-url coston2
```

## FTSO Configuration

### Current Setup
- **Proxy Asset**: BTC
- **Conversion Ratio**: 1 BTC = 10,000 bags of coffee
- **Auto-Update**: Enabled

### Change FTSO Symbol

```bash
# Use ETH instead of BTC
cast send $ORACLE_ADDRESS \
  "configureFTSO(string,uint256,bool)" \
  "ETH" \
  5000 \
  true \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY

# Disable FTSO (use manual updates only)
cast send $ORACLE_ADDRESS \
  "configureFTSO(string,uint256,bool)" \
  "BTC" \
  10000 \
  false \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

### Manual Price Updates

```bash
# Update price manually (if FTSO disabled)
# Price: $5.50 = 5500000000000000000 (18 decimals)
cast send $ORACLE_ADDRESS \
  "updateBasePrice(uint256)" \
  5500000000000000000 \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

## Troubleshooting

### FTSO Update Fails

**Error**: "Price too old" or "Invalid FTSO price"

**Solution**: FTSO data may not be available yet. Wait a few minutes or use manual update:

```bash
cast send $ORACLE_ADDRESS \
  "updateBasePrice(uint256)" \
  5000000000000000000 \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

### Insufficient Funds

**Error**: "Insufficient premium"

**Solution**: Send more CFLR with the transaction:

```bash
# Increase --value to 2 ether or more
cast send $VAULT_ADDRESS \
  "createPolicy(...)" \
  --value 2ether \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

### Policy Creation Fails

**Error**: "Coverage too low" or "Coverage too high"

**Solution**: Use coverage between $1,000 and $100,000:

```bash
# Minimum: 1000 * 10^6 = 1000000000
# Maximum: 100000 * 10^6 = 100000000000

# Example: $10,000 coverage
cast send $VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 \
  -44555000 \
  10000000000 \
  --value 1ether \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

## Network Information

### Coston2 Testnet
- **RPC**: https://coston2-api.flare.network/ext/C/rpc
- **Chain ID**: 114
- **Explorer**: https://coston2-explorer.flare.network/
- **Faucet**: https://faucet.flare.network/

### System Contracts
- **FTSO Registry**: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
- **FDC Verification**: 0x89D20A10a3014B2023023F01d9337583B9273c52
- **Contract Registry**: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019

## Verification

### Verify Contracts on Explorer

```bash
# Verify WeatherOracleWithFTSO
forge verify-contract \
  $ORACLE_ADDRESS \
  src/WeatherOracleWithFTSO.sol:WeatherOracleWithFTSO \
  --chain-id 114 \
  --constructor-args $(cast abi-encode "constructor(uint256)" 5000000000000000000) \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Verify InsuranceVault
forge verify-contract \
  $VAULT_ADDRESS \
  src/InsuranceVault.sol:InsuranceVault \
  --chain-id 114 \
  --constructor-args $(cast abi-encode "constructor(address)" $ORACLE_ADDRESS) \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Production Checklist

- [ ] Deploy all contracts to Coston2
- [ ] Test FTSO price updates
- [ ] Create test insurance policy
- [ ] Simulate weather event
- [ ] Test claim payout
- [ ] Verify contracts on explorer
- [ ] Update frontend with contract addresses
- [ ] Test frontend integration
- [ ] Set up automated FTSO updates
- [ ] Configure FDC weather attestations
- [ ] Deploy to mainnet (when ready)

## Support

- **Flare Discord**: https://discord.gg/flarenetwork
- **Flare Docs**: https://dev.flare.network/
- **FTSO Guide**: https://dev.flare.network/ftso/
- **FDC Guide**: https://dev.flare.network/fdc/

---

**Status**: Ready for hackathon deployment! 🚀

All contracts are production-ready with FTSO integration enabled.
