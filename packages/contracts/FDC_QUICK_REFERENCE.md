# FDC & FTSO Integration - Quick Reference

## Environment Setup

```bash
cp .env.example .env
# Fill in: PRIVATE_KEY, WEATHER_ORACLE_ADDRESS, API keys
```

## Commands

### FDC (Weather Data)

```bash
# Test weather API connection
npm run fdc:test minas_gerais

# Create FDC attestation request
npm run fdc:create minas_gerais

# Submit FDC proof to contract
npm run fdc:submit proof.json

# Manual weather update (for testing)
npm run fdc:manual 0  # Severe drought (0mm rainfall)
npm run fdc:manual 15 # Normal conditions
```

### FTSO (Price Feeds)

```bash
# Check FTSO status
npm run ftso:status

# Update price from FTSO
npm run ftso:update

# Configure FTSO (symbol, ratio, enabled)
npm run ftso:configure BTC 10000 true

# List available FTSO symbols
npm run ftso:list
```

### Shell Scripts

```bash
# Deploy to Coston2
./deploy-coston2.sh

# Test FTSO integration
./test-ftso.sh

# Simulate drought
./simulate-drought.sh 0  # Severe drought

# Update oracle price
NEW_PRICE=5000000000000000000 ./update-oracle-price.sh
```

## Contract Functions

### WeatherOracle (FDC)

```solidity
// FDC proof submission
function setWeatherDisruptionWithFDC(IWeb2Json.Proof calldata proof) external

// Manual update (owner only)
function updateWeatherSimple(uint256 rainfall, int256 lat, int256 lon) external

// Read state
function getCurrentWeatherEvent() external view returns (uint8, int256, uint256, bool)
function getTheoreticalPrice() external view returns (uint256)
```

### WeatherOracleWithFTSO

```solidity
// FTSO price update
function updatePriceFromFTSO() external

// Configure FTSO
function configureFTSO(string memory symbol, uint256 ratio, bool enabled) external

// Read FTSO state
function getCurrentFTSOPrice() external view returns (uint256, uint256, uint256)
function getAvailableFTSOSymbols() external view returns (string[] memory)
```

## Weather Multipliers

| Rainfall | Status | Multiplier | Impact |
|----------|--------|------------|--------|
| 0mm | SEVERE DROUGHT | 150% | +50% |
| 1-5mm | MODERATE DROUGHT | 130% | +30% |
| 5-10mm | MILD DROUGHT | 115% | +15% |
| 10mm+ | NORMAL | 100% | 0% |

## Network Info

### Coston2 Testnet
- RPC: https://coston2-api.flare.network/ext/C/rpc
- Chain ID: 114
- Explorer: https://coston2-explorer.flare.network/
- Faucet: https://faucet.flare.network/

### FDC Verifier
- URL: https://fdc-verifiers-testnet.flare.network/
- Docs: https://dev.flare.network/fdc/

## Troubleshooting

| Error | Solution |
|-------|----------|
| "FTSO not enabled" | Run: npm run ftso:configure BTC 10000 true |
| "Invalid FDC proof" | Check proof timestamp < 1 hour |
| "Only owner can call" | Use deployer wallet |
| "Price too old" | Submit fresh attestation |
