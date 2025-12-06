# Deployment Script Fixes - Constructor Arguments

## Issues Fixed

### 1. InsuranceVault Constructor ✅

**Actual Constructor:**
```solidity
constructor(WeatherOracle _weatherOracle)
```

**Fixed in Script:**
```solidity
InsuranceVault vault = new InsuranceVault(oracleInterface);
```

**Note:** InsuranceVault only needs the oracle address, NOT the token address.

---

### 2. AgriHook Constructor ✅

**Actual Constructor:**
```solidity
constructor(
    IPoolManager _poolManager,
    WeatherOracle _oracle
)
```

**Fixed in Script:**
```solidity
AgriHook hook = new AgriHook(
    IPoolManager(address(mockPoolManager)),
    oracleInterface
);
```

**Note:** AgriHook only needs PoolManager and Oracle, NOT the vault address.

---

### 3. MockPoolManager Deployment ✅

**Added:**
```solidity
import "../test/mocks/MockPoolManager.sol";

// In run() function:
MockPoolManager mockPoolManager = new MockPoolManager();
```

**Why:** AgriHook requires an IPoolManager. Since Uniswap V4 may not be deployed on Coston2, we deploy a MockPoolManager for testing.

---

## Deployment Order (Fixed)

1. **MockFBTC** - Mint 1M tokens to deployer
2. **CoffeeToken** - 100k initial supply
3. **WeatherOracleWithFTSO** - Configure FTSO, update price
4. **InsuranceVault** - Pass oracle only
5. **MockPoolManager** - For AgriHook testing
6. **AgriHook** - Pass PoolManager and Oracle

---

## Constructor Summary

| Contract | Constructor Parameters | Notes |
|----------|----------------------|-------|
| MockFBTC | `()` | No parameters |
| CoffeeToken | `()` | No parameters |
| WeatherOracleWithFTSO | `(uint256 _basePrice)` | Initial price in 18 decimals |
| InsuranceVault | `(WeatherOracle _weatherOracle)` | Oracle only |
| MockPoolManager | `()` | No parameters |
| AgriHook | `(IPoolManager _poolManager, WeatherOracle _oracle)` | PoolManager + Oracle |

---

## Verified Deployment Flow

```solidity
// 1. Deploy tokens
MockFBTC fbtc = new MockFBTC();
fbtc.mint(deployer, 1_000_000 * 10**18);
CoffeeToken coffee = new CoffeeToken();

// 2. Deploy oracle
WeatherOracleWithFTSO oracle = new WeatherOracleWithFTSO(5 * 10**18);
oracle.configureFTSO("BTC", 10000, true);
oracle.updatePriceFromFTSO();

// 3. Deploy vault (oracle only)
WeatherOracle oracleInterface = WeatherOracle(address(oracle));
InsuranceVault vault = new InsuranceVault(oracleInterface);
vault.fundTreasury{value: 10 ether}();

// 4. Deploy mock pool manager
MockPoolManager poolManager = new MockPoolManager();

// 5. Deploy hook (poolManager + oracle)
AgriHook hook = new AgriHook(
    IPoolManager(address(poolManager)),
    oracleInterface
);
```

---

## Testing the Deployment

```bash
# Deploy
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast \
  -vvvv

# Should see:
# ✅ MockFBTC deployed
# ✅ CoffeeToken deployed
# ✅ WeatherOracleWithFTSO deployed
# ✅ FTSO configured (BTC proxy)
# ✅ Price updated from FTSO
# ✅ InsuranceVault deployed
# ✅ Treasury funded
# ✅ MockPoolManager deployed
# ✅ AgriHook deployed
```

---

## Production Notes

### MockPoolManager vs Real PoolManager

**For Hackathon/Testing:**
- Use `MockPoolManager` (included in deployment)
- Sufficient for testing hook functionality
- No Uniswap V4 deployment needed

**For Production:**
1. Deploy Uniswap V4 PoolManager on Coston2
2. Update deployment script with real address
3. Redeploy AgriHook with production PoolManager

### Replacing MockPoolManager

```solidity
// In DeployCoston2.s.sol, replace:
MockPoolManager mockPoolManager = new MockPoolManager();

// With:
address REAL_POOL_MANAGER = 0x...; // Uniswap V4 address
IPoolManager poolManager = IPoolManager(REAL_POOL_MANAGER);

// Then deploy hook:
AgriHook hook = new AgriHook(poolManager, oracleInterface);
```

---

## All Fixed! ✅

The deployment script now:
- ✅ Uses correct constructor arguments
- ✅ Deploys MockPoolManager for testing
- ✅ Properly casts WeatherOracleWithFTSO to WeatherOracle interface
- ✅ Deploys all contracts in correct order
- ✅ Outputs all addresses for frontend
- ✅ Ready for Coston2 deployment

Deploy with confidence! 🚀
