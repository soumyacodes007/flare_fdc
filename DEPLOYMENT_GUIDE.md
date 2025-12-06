# AgriHook Complete Deployment Guide

Complete guide to deploy all AgriHook contracts to Flare Coston2 testnet.

## 📋 Prerequisites

### 1. Tools Required
- **Foundry** (forge, cast, anvil)
- **Node.js** 18+ and npm
- **Git**
- **jq** (for JSON parsing)

### 2. API Keys Required
- **OpenWeatherMap API Key**: https://openweathermap.org/api (free tier)
- **Flare Coston2 Testnet CFLR**: https://faucet.flare.network/

### 3. Wallet Setup
- Private key with Coston2 testnet CFLR
- Recommended: 10+ CFLR for deployment and testing

---

## 🚀 Quick Deployment

### Step 1: Clone and Setup

```bash
# Clone repository
git clone <your-repo>
cd agrirhook/packages/contracts

# Install dependencies
npm install
forge install
```

### Step 2: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env and add:
# - PRIVATE_KEY (your wallet private key)
# - OPENWEATHER_API_KEY (from openweathermap.org)
```

**`.env` file:**
```bash
# Deployment
PRIVATE_KEY=0x...
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc

# APIs
OPENWEATHER_API_KEY=your_openweathermap_key

# Deployed Addresses (filled after deployment)
WEATHER_ORACLE_ADDRESS=
AGRI_HOOK_ADDRESS=
INSURANCE_VAULT_ADDRESS=
FBTC_ADDRESS=
COFFEE_ADDRESS=
POOL_MANAGER_ADDRESS=
```

### Step 3: Deploy All Contracts

```bash
# Deploy to Coston2
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url $COSTON2_RPC \
  --broadcast \
  --verify

# Or use the npm script
npm run deploy:coston2
```

### Step 4: Save Deployment Addresses

The deployment script will output all addresses. Copy them to your `.env`:

```bash
# Extract addresses from deployment
jq '.transactions[] | select(.contractName != null) | {name: .contractName, address: .contractAddress}' \
  broadcast/DeployCoston2.s.sol/114/run-latest.json
```

---

## 📦 What Gets Deployed

The deployment script deploys **6 contracts** in this order:

### 1. **MockFBTC** (FAsset Bitcoin)
- ERC20 token representing Bitcoin on Flare
- 18 decimals
- Initial supply: 1,000,000 FBTC minted to deployer

### 2. **CoffeeToken**
- ERC20 token representing coffee commodity
- 18 decimals
- Initial supply: 1,000,000 COFFEE

### 3. **WeatherOracleWithFTSO**
- Inherits from WeatherOracle
- Supports FDC weather data proofs
- Supports FTSO price feeds
- Initial base price: 5 FBTC
- FTSO configured: BTC proxy (1 BTC = 10,000 bags)

### 4. **InsuranceVault**
- Agricultural insurance vault
- Connected to WeatherOracle
- Initial treasury: 10 CFLR

### 5. **MockPoolManager**
- Mock Uniswap V4 PoolManager for testing
- Replace with real PoolManager in production

### 6. **AgriHook**
- Uniswap V4 Hook with dynamic fees
- Connected to WeatherOracle
- Connected to MockPoolManager

---

## 🔗 Contract Relationships

```
┌─────────────────────┐
│ WeatherOracleWithFTSO│
│  (inherits from)    │
│  WeatherOracle      │
└──────────┬──────────┘
           │
           ├──────────────────┐
           ↓                  ↓
    ┌──────────────┐   ┌──────────────┐
    │  AgriHook    │   │InsuranceVault│
    │              │   │              │
    └──────┬───────┘   └──────────────┘
           │
           ↓
    ┌──────────────┐
    │MockPoolManager│
    └──────────────┘

┌──────────────┐   ┌──────────────┐
│  MockFBTC    │   │ CoffeeToken  │
│  (ERC20)     │   │  (ERC20)     │
└──────────────┘   └──────────────┘
```

---

## ✅ Post-Deployment Verification

### 1. Verify Contracts on Explorer

```bash
# Contracts are auto-verified if --verify flag is used
# Check on Coston2 Explorer:
# https://coston2-explorer.flare.network/
```

### 2. Test FTSO Integration

```bash
# Update price from FTSO
cast send $WEATHER_ORACLE_ADDRESS \
  "updatePriceFromFTSO()" \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check updated price
cast call $WEATHER_ORACLE_ADDRESS \
  "basePrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

### 3. Test FDC Integration

```bash
# Test weather API
npm run fdc:test minas_gerais

# Expected output:
# ✅ Weather data fetched
# ✅ Drought analysis complete
# ✅ Contract validation passed
```

### 4. Test Manual Weather Update

```bash
# Simulate severe drought (0mm rainfall)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check theoretical price (should be 1.5x base price)
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

### 5. Test Insurance Vault

```bash
# Create insurance policy
cast send $INSURANCE_VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 -44555000 5000000000 \
  --value 1ether \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check policy
cast call $INSURANCE_VAULT_ADDRESS \
  "policies(address)(address,int256,int256,bytes32,uint256,uint256,uint256,uint256,bool,bool)" \
  <YOUR_ADDRESS> \
  --rpc-url $COSTON2_RPC
```

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Weather (No Drought)

```bash
# Set normal rainfall (15mm)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  15 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check price (should equal base price)
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

### Scenario 2: Mild Drought

```bash
# Set mild drought (7mm rainfall)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  7 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check price (should be 1.15x base price)
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

### Scenario 3: Severe Drought + Insurance Claim

```bash
# 1. Create policy
cast send $INSURANCE_VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 -44555000 5000000000 \
  --value 1ether \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# 2. Trigger severe drought
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# 3. Claim payout
cast send $INSURANCE_VAULT_ADDRESS \
  "claimPayout()" \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY
```

---

## 🌐 Frontend Integration

### Update Frontend Environment

```bash
# In your frontend .env.local
NEXT_PUBLIC_CHAIN_ID=114
NEXT_PUBLIC_RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# Contract Addresses (from deployment)
NEXT_PUBLIC_WEATHER_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_AGRI_HOOK_ADDRESS=0x...
NEXT_PUBLIC_INSURANCE_VAULT_ADDRESS=0x...
NEXT_PUBLIC_FBTC_ADDRESS=0x...
NEXT_PUBLIC_COFFEE_ADDRESS=0x...
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...

# System Addresses
NEXT_PUBLIC_FTSO_REGISTRY=0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
NEXT_PUBLIC_FDC_VERIFICATION=0x89D20A10a3014B2023023F01d9337583B9273c52
```

### Get Test Tokens

```bash
# Mint FBTC to your address
cast send $FBTC_ADDRESS \
  "mint(address,uint256)" \
  <YOUR_ADDRESS> \
  1000000000000000000000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check balance
cast call $FBTC_ADDRESS \
  "balanceOf(address)(uint256)" \
  <YOUR_ADDRESS> \
  --rpc-url $COSTON2_RPC
```

---

## 🔧 Troubleshooting

### Deployment Fails

**Error: "Insufficient funds"**
```bash
# Get testnet CFLR from faucet
# https://faucet.flare.network/
```

**Error: "Nonce too low"**
```bash
# Reset nonce
cast nonce <YOUR_ADDRESS> --rpc-url $COSTON2_RPC
```

### FTSO Update Fails

**Error: "FTSO not enabled"**
```bash
# Enable FTSO
cast send $WEATHER_ORACLE_ADDRESS \
  "configureFTSO(string,uint256,bool)" \
  "BTC" 10000 true \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY
```

**Error: "Price too old"**
```bash
# FTSO data may not be available yet
# Wait a few minutes and try again
```

### FDC Integration Issues

**Error: "Invalid API key"**
```bash
# Check OPENWEATHER_API_KEY in .env
# Get new key from https://openweathermap.org/api
```

**Error: "Rate limit exceeded"**
```bash
# Free tier: 60 calls/minute
# Wait 1 minute or upgrade plan
```

---

## 📚 Documentation

- **FDC Quick Start**: `packages/contracts/FDC_QUICKSTART.md`
- **FDC Integration**: `packages/contracts/FDC_INTEGRATION.md`
- **FDC Comparison**: `packages/contracts/FDC_COMPARISON.md`
- **Hook Deployment**: `packages/contracts/HOOK_DEPLOYMENT.md`

---

## 🎯 Production Deployment Checklist

- [ ] Deploy to Coston2 testnet
- [ ] Verify all contracts on explorer
- [ ] Test FTSO price updates
- [ ] Test FDC weather integration
- [ ] Test insurance policy creation
- [ ] Test claim payouts
- [ ] Test AgriHook with swaps
- [ ] Update frontend with addresses
- [ ] Test frontend integration
- [ ] Document deployment addresses
- [ ] Set up monitoring/alerts
- [ ] Replace MockPoolManager with real Uniswap V4
- [ ] Deploy to mainnet (when ready)

---

## 🚀 Next Steps

1. ✅ Deploy contracts
2. ✅ Verify on explorer
3. ✅ Test FTSO integration
4. ✅ Test FDC integration
5. ⏳ Integrate with frontend
6. ⏳ Test end-to-end flows
7. ⏳ Deploy to production

---

*For support, see documentation or ask in Discord.*
