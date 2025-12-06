# FTSO Integration Scripts

Scripts for integrating with Flare Time Series Oracle (FTSO) for real-time price feeds.

## Scripts

| Script | Description |
|--------|-------------|
| `list-ftso-symbols.ts` | List all available FTSO price feeds |
| `update-price-ftso.ts` | Update oracle price from FTSO |

## Quick Start

```bash
# 1. List available symbols
npm run ftso:list

# 2. Check current FTSO status
npm run ftso:status

# 3. Configure FTSO (symbol, ratio, enabled)
npm run ftso:configure BTC 10000 true

# 4. Update price from FTSO
npm run ftso:update
```

## Configuration

The WeatherOracleWithFTSO uses FTSO as a proxy for coffee commodity pricing:

```solidity
// Configure: 1 BTC = 10,000 bags of coffee
oracle.configureFTSO("BTC", 10000, true);

// Update price from FTSO
oracle.updatePriceFromFTSO();
```

## Available Symbols (Coston2)

Common symbols available on FTSO:
- `BTC` - Bitcoin (recommended proxy)
- `ETH` - Ethereum
- `XRP` - Ripple
- `FLR` - Flare
- `LTC` - Litecoin
- `DOGE` - Dogecoin

## Price Conversion

```
Coffee Price = FTSO Price / Ratio

Example:
- BTC Price: $100,000
- Ratio: 10,000
- Coffee Price: $10 per bag
```

## Contract Functions

```solidity
// Configure FTSO
function configureFTSO(string symbol, uint256 ratio, bool enabled) external

// Update price
function updatePriceFromFTSO() external

// Read state
function getCurrentFTSOPrice() external view returns (uint256, uint256, uint256)
function getAvailableFTSOSymbols() external view returns (string[])
```

## Links

- FTSO Docs: https://dev.flare.network/ftso/
- Coston2 Explorer: https://coston2-explorer.flare.network/
