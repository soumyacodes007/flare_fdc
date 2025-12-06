# FDC Integration Scripts

Scripts for integrating with Flare Data Connector (FDC) to fetch verifiable weather data.

## Scripts

| Script | Description |
|--------|-------------|
| `test-weather-api.ts` | Test weather API connections (OpenWeatherMap, WeatherAPI, VisualCrossing) |
| `create-attestation-request.ts` | Generate FDC attestation request JSON |
| `submit-proof.ts` | Submit FDC proof to WeatherOracle contract |

## Quick Start

```bash
# 1. Test weather API connection
npm run fdc:test minas_gerais

# 2. Create attestation request
npm run fdc:create minas_gerais

# 3. Submit proof (after FDC verification)
npm run fdc:submit proof.json

# 4. Manual update (for testing)
npm run fdc:manual 0  # Severe drought
```

## Coffee Regions

| Region | Location | Coordinates |
|--------|----------|-------------|
| `minas_gerais` | Minas Gerais, Brazil | -18.5122, -44.5550 |
| `antioquia` | Antioquia, Colombia | 5.5689, -75.6794 |
| `central_highlands` | Central Highlands, Vietnam | 12.2646, 108.0323 |
| `kona` | Kona, Hawaii | 19.6400, -155.9969 |

## Weather Data Format

```solidity
struct WeatherData {
    uint256 rainfall;      // mm (last hour)
    int256 temperature;    // Celsius × 100
    int256 soilMoisture;   // Humidity % × 100
    int256 latitude;       // GPS × 1e6
    int256 longitude;      // GPS × 1e6
    uint256 timestamp;     // Unix timestamp
}
```

## FDC Workflow

1. **Test API** → Verify weather data sources work
2. **Create Request** → Generate attestation request JSON
3. **Submit to FDC** → Send to Flare verifier network
4. **Get Proof** → Receive Merkle proof
5. **Update Contract** → Call `setWeatherDisruptionWithFDC(proof)`

## Links

- FDC Docs: https://dev.flare.network/fdc/
- FDC Verifier: https://fdc-verifiers-testnet.flare.network/
- Coston2 Faucet: https://faucet.flare.network/
