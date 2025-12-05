# 🚀 Agri-Hook Quick Start Guide

## 1. Prerequisites (5 minutes)

### Get Coston2 CFLR
```bash
# Visit faucet
https://faucet.flare.network/

# Select "Coston2 Testnet"
# Paste your wallet address
# Click "Request CFLR"
# Wait 30 seconds
```

### Setup Environment
```bash
# Copy environment template
cp packages/contracts/.env.example packages/contracts/.env

# Edit .env and add your private key
nano packages/contracts/.env
# Set: PRIVATE_KEY=your_private_key_here
```

## 2. Deploy Contracts (2 minutes)

```bash
cd packages/contracts

# Deploy all contracts to Coston2
forge script script/DeployCoston2.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast \
  --private-key $PRIVATE_KEY

# Expected output:
# ✅ MockFBTC deployed at: 0x...
# ✅ CoffeeToken deployed at: 0x...
# ✅ WeatherOracle deployed at: 0x...
# ✅ InsuranceVault deployed at: 0x...
```

### Save Contract Addresses

Copy the addresses from deployment output to `.env`:

```bash
# Add to .env
MOCK_FBTC_ADDRESS=0x...
COFFEE_TOKEN_ADDRESS=0x...
WEATHER_ORACLE_ADDRESS=0x...
INSURANCE_VAULT_ADDRESS=0x...
```

## 3. Get Test Tokens (1 minute)

```bash
# Get 100 FBTC (FAsset Bitcoin)
cast send $MOCK_FBTC_ADDRESS "faucet()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Get 100 COFFEE tokens
cast send $COFFEE_TOKEN_ADDRESS "faucet()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Check balances
cast call $MOCK_FBTC_ADDRESS "balanceOf(address)(uint256)" $YOUR_ADDRESS \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc

cast call $COFFEE_TOKEN_ADDRESS "balanceOf(address)(uint256)" $YOUR_ADDRESS \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## 4. Test System (3 minutes)

### Test FDC Connection
```bash
cd scripts
python test-fdc-connection.py

# Expected:
# ✅ Connected to Coston2
# ✅ FDC Verification contract found
# ✅ Weather APIs reachable
```

### Test Contracts
```bash
python test-contracts-e2e.py

# Expected:
# ✅ PASS - weather_oracle
# ✅ PASS - insurance_vault
# ✅ PASS - mock_fbtc
# ✅ PASS - coffee_token
# Total: 4/4 tests passed
```

### Test Drought Scenario
```bash
python test-drought-scenario.py

# Expected:
# 🎉 AGRI-HOOK SUCCESSFULLY PROTECTS JOÃO!
# ✅ All 6 Math Innovations Demonstrated
# ✅ All 9 Smart Contract Features Demonstrated
```

## 5. Interact with Contracts (5 minutes)

### Update Weather (Simulate Drought)
```bash
# Simulate severe drought (0mm rainfall)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 \
  -18512200 \
  -44555000 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Check new theoretical price
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Should show 150% of base price (drought multiplier)
```

### Create Insurance Policy
```bash
# Calculate premium first
cast call $INSURANCE_VAULT_ADDRESS \
  "calculatePremium(uint256,bytes32)(uint256)" \
  5000000000000000000000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Create policy (send premium as value)
cast send $INSURANCE_VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 \
  -44555000 \
  5000000000000000000000 \
  --value 0.5ether \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Check your policy
cast call $INSURANCE_VAULT_ADDRESS \
  "getPolicy(address)" \
  $YOUR_ADDRESS \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

### Claim Payout (After Drought)
```bash
# Claim insurance payout
cast send $INSURANCE_VAULT_ADDRESS \
  "claimPayout()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Check vault stats
cast call $INSURANCE_VAULT_ADDRESS \
  "getVaultStats()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## 6. Verify on Explorer (1 minute)

Visit Coston2 Explorer:
```
https://coston2-explorer.flare.network/
```

Search for your contract addresses to see:
- ✅ Deployment transactions
- ✅ Contract interactions
- ✅ Token transfers
- ✅ Event logs

## Common Commands

### Check Contract State
```bash
# Weather Oracle
cast call $WEATHER_ORACLE_ADDRESS "basePrice()(uint256)" --rpc-url https://coston2-api.flare.network/ext/C/rpc
cast call $WEATHER_ORACLE_ADDRESS "getTheoreticalPrice()(uint256)" --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Insurance Vault
cast call $INSURANCE_VAULT_ADDRESS "getVaultStats()" --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Token Balances
cast call $MOCK_FBTC_ADDRESS "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
cast call $COFFEE_TOKEN_ADDRESS "balanceOf(address)(uint256)" $YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

### Fund Treasury
```bash
cast send $INSURANCE_VAULT_ADDRESS \
  "fundTreasury()" \
  --value 1ether \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY
```

## Troubleshooting

### "Insufficient funds"
```bash
# Get more CFLR from faucet
https://faucet.flare.network/
```

### "Contract not found"
```bash
# Redeploy contracts
forge script script/DeployCoston2.s.sol --rpc-url https://coston2-api.flare.network/ext/C/rpc --broadcast
```

### "Transaction reverted"
```bash
# Check contract state
cast call $CONTRACT_ADDRESS "function()" --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Check your balance
cast balance $YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

### Python script errors
```bash
# Install dependencies
pip install web3 requests

# Check environment variables
echo $PRIVATE_KEY
echo $WEATHER_ORACLE_ADDRESS
```

## Next Steps

1. ✅ Deploy contracts
2. ✅ Test all features
3. ✅ Simulate drought scenario
4. ✅ Create insurance policy
5. ✅ Claim payout
6. 📚 Read full documentation in `README.md`
7. 🔍 Review code in `src/` folder
8. 🧪 Run more tests in `scripts/` folder

## Resources

- **Flare Docs**: https://docs.flare.network/
- **FAssets**: https://docs.flare.network/tech/fassets/
- **Faucet**: https://faucet.flare.network/
- **Explorer**: https://coston2-explorer.flare.network/
- **Discord**: https://discord.gg/flarenetwork

## Support

Need help?
1. Check `FASSETS_INTEGRATION.md` for detailed guide
2. Review `REFACTOR_SUMMARY.md` for changes
3. Run test scripts to verify setup
4. Join Flare Discord for support

---

**🎉 You're ready to use Agri-Hook with FAssets!**

Total setup time: ~15 minutes
