# 🌾 AGRI-HOOK - Agricultural Weather Insurance via Uniswap V4

Trustless agricultural hedging using Flare's FTSO price feeds and weather data to protect farmers from climate-driven price volatility.

## 🎯 What This Is

A Uniswap V4 Hook that protects coffee farmers by:
- Using Flare's FTSO for real-time price feeds
- Integrating weather data to adjust commodity prices
- Capturing arbitrage fees to fund farmer insurance
- Providing instant payouts when drought conditions are verified

## 📦 Deployed Contracts (Flare Coston2 Testnet)

**Deployer:** `0x750Fc8e72A4b00da9A5C9b116487ABC28360023f`

| Contract | Address |
|----------|---------|
| MockFBTC | `0x8C691A99478D3b3fE039f777650C095578debF12` |
| CoffeeToken | `0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c` |
| WeatherOracleWithFTSO | `0x223163b9109e43BdA9d719DF1e7E584d781b93fd` |
| InsuranceVault | `0x6c6ad692489a89514bD4C8e9344a0Bc387c32438` |
| MockPoolManager | `0x513be19378C375466e29D6b4d001E995FBA8c2ce` |
| AgriHook | `0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0` |

## ✅ What's Working

### Core Infrastructure
- ✅ All contracts deployed to Flare Coston2
- ✅ FTSO price feed integration working
- ✅ Weather oracle with multi-API support (OpenWeatherMap, WeatherAPI, Visual Crossing)
- ✅ Insurance vault with policy creation
- ✅ AgriHook deployed with CREATE2 (correct address flags)
- ✅ Dynamic fee system based on price deviation
- ✅ Bonus system for aligned traders

### Smart Contracts
- ✅ **WeatherOracleWithFTSO**: Fetches FLR/USD prices from Flare's FTSO
- ✅ **InsuranceVault**: Creates policies, handles claims, manages payouts
- ✅ **AgriHook**: Uniswap V4 hook with beforeSwap/afterSwap logic
- ✅ **CoffeeToken**: ERC20 token representing tokenized coffee
- ✅ **MockFBTC**: Mock Bitcoin token for testing

### Features
- ✅ Weather-adjusted pricing (drought detection)
- ✅ Circuit breaker system (50% recovery, 100% freeze)
- ✅ Quadratic fee curves for arbitrage capture
- ✅ Quadratic bonus curves for aligned traders
- ✅ Treasury funding from misaligned trader fees

## ❌ What's Not Done

### Integration & Testing
- ❌ No liquidity pool initialized yet
- ❌ Hook not registered with PoolManager
- ❌ No test swaps executed
- ❌ FDC (Flare Data Connector) integration incomplete
- ❌ Cross-chain messaging not implemented
- ❌ No frontend/UI

### Smart Contract Gaps
- ❌ Bonus token transfers not implemented (TODO in AgriHook)
- ❌ Pool price updates not automated
- ❌ No keeper/bot for oracle updates
- ❌ Weather data not automatically triggering insurance claims

### Production Readiness
- ❌ No comprehensive test suite
- ❌ Contracts not verified on block explorer
- ❌ No monitoring/alerting system
- ❌ No documentation for end users

## 🚀 Quick Start

### Prerequisites
```bash
forge --version  # Foundry required
node --version   # Node.js 18+
npm --version    # npm for test scripts
```

### Setup
```bash
cd agrirhook/packages/contracts

# Install dependencies
npm install

# Copy .env and add your private key
cp .env.example .env
# Edit .env: PRIVATE_KEY=your_key_here

# Compile contracts
forge build
```

## 🧪 Testing

### Automated Tests (Recommended)

```bash
# Test all contracts
npm run test:contracts

# Test weather APIs
npm run test:weather minas_gerais

# Create insurance policy
npm run policy:create minas_gerais 5

# Simulate drought
npm run drought:simulate 0

# Process claim
npm run claim:process 0
```

### Complete Test Flow

```bash
# Run all tests in sequence
chmod +x scripts/quick-test.sh
./scripts/quick-test.sh
```

See [TESTING_GUIDE.md](./packages/contracts/TESTING_GUIDE.md) for detailed instructions.

### Manual Testing with Cast

```bash
# Update price from FTSO
cast send $WEATHER_ORACLE_ADDRESS "updatePriceFromFTSO()" \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Create policy
cast send $INSURANCE_VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 -44555000 5000000000 \
  --value 1ether \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY
```

## 📁 Project Structure

```
agrirhook/
├── packages/
│   └── contracts/
│       ├── src/
│       │   ├── AgriHook.sol              # Main V4 hook
│       │   ├── WeatherOracle.sol         # FTSO + weather data
│       │   ├── InsuranceVault.sol        # Policy management
│       │   ├── CoffeeToken.sol           # Commodity token
│       │   ├── MockFBTC.sol              # Test collateral
│       │   └── libraries/
│       │       ├── FeeCurve.sol          # Dynamic fees
│       │       └── BonusCurve.sol        # Trader bonuses
│       ├── script/
│       │   ├── DeployAllCoston2.s.sol    # Full deployment
│       │   ├── MineHookSalt.s.sol        # Find valid hook address
│       │   └── DeployHookCREATE2.s.sol   # Deploy hook
│       └── test/                         # Test files
└── README.md
```

## 🔧 How It Works

### 1. Price Oracle
```
FTSO Price Feed → Weather Adjustment → Theoretical Price
$5.00 FLR/USD  →  +50% drought     →  $7.50 adjusted
```

### 2. Dynamic Fees
```
Pool Price: $5.00
Oracle Price: $7.50
Deviation: 50%

Aligned Trader (seller):   0.01% fee + 2.5% bonus
Misaligned Trader (buyer): 50% fee + 0% bonus
```

### 3. Insurance Flow
```
1. Farmer creates policy (location + premium)
2. Oracle monitors weather (rainfall, temperature)
3. Drought detected → claim eligible
4. Farmer claims → instant payout from vault
```

## 🛠️ Next Steps

### Immediate (Demo Ready)
1. Initialize liquidity pool with CoffeeToken/MockFBTC
2. Register AgriHook with PoolManager
3. Execute test swaps to verify fee/bonus logic
4. Trigger insurance claim with simulated drought

### Short Term (Production)
1. Implement FDC attestation verification
2. Add automated keeper for oracle updates
3. Build simple frontend for policy creation
4. Add comprehensive test coverage

### Long Term (Scale)
1. Support multiple commodities (wheat, corn, soybeans)
2. Cross-chain deployment (Flare mainnet, other chains)
3. Real farmer onboarding
4. Integration with commodity exchanges

## 📊 Key Metrics

- **Total Deployment Cost**: 0.101 C2FLR
- **Hook Address Flags**: `0xc0` (beforeSwap + afterSwap)
- **Circuit Breaker Thresholds**: 50% recovery, 100% freeze
- **Max Fee**: 10% (100% deviation)
- **Max Bonus**: 5% (quadratic scaling)

## 🔗 Resources

- [Flare FTSO Docs](https://docs.flare.network/tech/ftso/)
- [Uniswap V4 Hooks](https://docs.uniswap.org/contracts/v4/overview)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [FDC Integration](./packages/contracts/FDC_INTEGRATION.md)

## 📝 License

MIT
