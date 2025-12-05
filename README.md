# 🌾 AGRI-HOOK - Trustless Agricultural Hedging via Dynamic AMM Protection

**Tagline:** "The farmer who survives the drought by turning liquidity provision into insurance."

**One-Liner:** A Uniswap V4 Hook that uses Flare's Data Connector to protect farmers (who are LPs) from arbitrage exploitation during climate events, creating the first permissionless agricultural hedge.

## Overview

This project implements a revolutionary dual-protection mechanism where:
- **Farmers are liquidity providers** - They deposit tokenized crops into Uniswap pools
- **Weather events trigger protection** - Real-time satellite data activates circuit breakers
- **Arbitrage bots fund insurance** - Bots trying to exploit pay fees that protect farmers
- **Instant payouts** - Smart contracts pay farmers automatically when drought is confirmed
- **Self-sustaining** - The system funds itself through arbitrage capture
- Uses **Flare Data Connector (FDC)** for decentralized, verifiable weather data

## How It Works

### Example Scenario

**Setup:**
- Oracle theoretical price: $5.00 (based on real-world coffee prices via FDC)
- Drought detected: 0mm rainfall for 7 days (verified by 3 weather APIs)
- Weather-adjusted price: $7.50 (50% drought premium)
- Pool price: $5.00 (hasn't updated yet)
- Deviation: 50% too low

**Trading Dynamics:**

| Trader Type | Action | Fee | Bonus | Net Result |
|------------|--------|-----|-------|------------|
| Seller (aligned) | Sells 1 COFFEE | 0.01% | +$1.25 (25%) | Gets $6.25 (ABOVE market!) |
| Buyer (misaligned) | Buys 1 COFFEE | 50% | None | Pays $7.50 total |

**Result:** Sellers are incentivized to sell, pushing price up toward $7.50. Bots can't exploit the stale price. Farmers' LP positions are protected.

## Project Structure

```
ETHGlobalBuenosAires25/
├── IMPLEMENTATION_PLAN.md          # Detailed implementation plan
├── package.json                     # Root workspace config
└── packages/
    ├── contracts/                   # Smart contracts (Hardhat 3)
    │   ├── contracts/
    │   │   ├── CoffeeToken.sol      # Coffee ERC20 token (COFFEE)
    │   │   ├── MockFBTC.sol         # Mock FAsset Bitcoin (18 decimals)
    │   │   ├── WeatherOracle.sol    # FDC-powered weather oracle
    │   │   ├── AgriHook.sol         # Main V4 hook with all innovations
    │   │   └── libraries/
    │   │       ├── FeeCurve.sol     # Dynamic fee calculations
    │   │       └── BonusCurve.sol   # Bonus calculations
    │   ├── test/                    # Tests
    │   ├── hardhat.config.ts
    │   └── package.json
    ├── frontend/                    # Next.js UI (TODO)
    └── shared/                      # Shared types/utils
```

## Smart Contracts

### Deployed Contracts

#### NatGasToken.sol
- Standard ERC20 representing natural gas
- Symbol: **NATGAS**
- 18 decimals
- Mintable for testing

#### MockFBTC.sol
- Mock FAsset Bitcoin for testnet
- 18 decimals (standard ERC20)
- Includes `faucet()` function for easy testing
- Represents tokenized Bitcoin on Flare Network

#### DisruptionOracle.sol
- **Powered by Flare Data Connector (FDC)** for decentralized price feeds
- Tracks real-world disruption events (for future iterations)
- Price calculation:
  - Base price updated via FDC attestations from external APIs
  - Disruption tracking available but not affecting price in initial iteration
  - Anyone can submit valid FDC proofs to update prices
- **Disruption types** (tracked but inactive in v1):
  - Supply shock
  - Demand shock
  - Weather events
  - Sanctions

#### Libraries

**FeeCurve.sol**
- Quadratic, linear, and exponential fee curves
- Scales fees based on price deviation
- Caps at maximum to prevent extreme fees

**BonusCurve.sol**
- Quadratic, linear, and sqrt bonus curves
- Calculates bonus rates for aligned traders
- Includes treasury-adjusted bonuses

### NatGasDisruptionHook.sol (In Progress)

Main Uniswap V4 hook that:
1. **beforeSwap**: Sets dynamic fee based on alignment
2. **afterSwap**: Pays bonuses to aligned traders from treasury

## Flare Data Connector (FDC) Integration

### What is FDC?

Flare Data Connector enables smart contracts to access off-chain data in a decentralized and verifiable way. Unlike traditional oracles, FDC:
- Provides cryptographic proofs of external API data
- Allows anyone to submit price updates (fully decentralized)
- Verifies data authenticity on-chain before accepting

### How We Use FDC

**Price Updates:**
```solidity
// Anyone can call with valid FDC proof
function updateBasePriceWithFDC(IWeb2Json.Proof calldata proof) external
```

- Fetches natural gas prices from external APIs (EIA, commodity markets, etc.)
- Proof is verified on-chain using Flare's verification contract
- Price must be fresh (< 1 hour old)
- Updates basePrice used for theoretical price calculations

**Weather Disruptions (Future):**
```solidity
// Tracks weather events but doesn't affect price yet
function setWeatherDisruptionWithFDC(IWeb2Json.Proof calldata proof) external
```

- Weather data from external APIs with severity rating (0-10)
- Verified via FDC attestations
- Infrastructure ready for future iterations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Installation

```bash
# Clone repository
git clone <repo-url>
cd ETHGlobalBuenosAires25

# Install dependencies
npm install
cd packages/contracts
npm install
```

### Compile Contracts

```bash
cd packages/contracts
npx hardhat compile
```

### Run Tests

```bash
cd packages/contracts
npx hardhat test
```

### Deploy to Testnet

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export BASE_SEPOLIA_RPC=your_rpc_url

# Deploy
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Setup EIA API for FDC Integration

To feed real-time Henry Hub natural gas prices into the oracle:

1. **Register for EIA API key** (free, 2 minutes):
   ```bash
   # Visit: https://www.eia.gov/opendata/register.php
   # Save your API key to .env
   echo "EIA_API_KEY=your_key_here" >> .env
   ```

2. **Test the API connection**:
   ```bash
   cd packages/contracts
   npx ts-node scripts/fdc-integration/test-eia-api.ts
   ```

3. **View complete setup guide**:
   - See `scripts/fdc-integration/eia-api-setup.md` for detailed instructions
   - See `API_SOURCES.md` for alternative price sources

4. **Submit FDC attestation** (on Coston2 testnet):
   - Use the template in `scripts/fdc-integration/fdc-attestation-request.json`
   - See `scripts/fdc-integration/submit-fdc-proof.ts` for submission script

## Mechanism Details

### Fee Structure

- **Aligned traders**: 0.01% fee
- **Misaligned traders**: 0.3% - 10% (scales with deviation)
- **At equilibrium**: 0.3% base fee for all

### Bonus Structure

- **Maximum bonus**: 5% of swap amount
- **Scales quadratically** with price deviation
- **Zero bonus** when price = theoretical
- **Treasury-funded**: From accumulated misaligned trader fees

### Price Convergence

1. FDC updates theoretical price (e.g., $3.50 via external API proof)
2. Pool price diverges (e.g., $5.25 from speculation)
3. Sellers see 50% deviation → earn max bonuses
4. Arbitrageurs sell to capture bonuses
5. Pool price moves toward $3.50
6. Bonuses decrease as deviation shrinks
7. At $3.50: symmetric fees, no bonuses

## Disruption Types

The oracle supports multiple disruption types (infrastructure ready for future iterations):

- **SUPPLY_SHOCK**: Production disruptions (hurricanes, pipeline issues)
- **DEMAND_SHOCK**: Demand changes (winter demand spikes, seasonal shifts)
- **WEATHER**: Weather events affecting production/transport
- **SANCTIONS**: Geopolitical sanctions affecting supply

**Note**: In the initial hackathon iteration, disruptions are tracked but do not affect the theoretical price calculation. The price is based solely on FDC-verified external API data.

## Roadmap

### Phase 1: Core Contracts ✅
- [x] NatGasToken (NATGAS)
- [x] MockUSDC
- [x] DisruptionOracle with FDC integration
- [x] FeeCurve library
- [x] BonusCurve library

### Phase 2: Hook Implementation (In Progress)
- [ ] Create V4 interface definitions
- [ ] Implement NatGasDisruptionHook
- [ ] beforeSwap: Dynamic fee logic
- [ ] afterSwap: Bonus distribution

### Phase 3: Testing
- [ ] Unit tests for all contracts
- [ ] Integration tests
- [ ] Fee curve validation
- [ ] Price convergence simulation
- [ ] FDC proof validation tests

### Phase 4: Enhanced FDC Integration
- [ ] Weather disruption activation
- [ ] Additional disruption type integration
- [ ] Multi-source price aggregation

### Phase 5: Frontend
- [ ] Next.js setup
- [ ] Swap interface with fee/bonus preview
- [ ] Price dashboard
- [ ] Disruption timeline
- [ ] Treasury balance display
- [ ] FDC proof submission interface

### Phase 6: Deployment
- [ ] Deploy to Flare testnet (Coston2)
- [ ] Deploy to Base Sepolia
- [ ] Initialize pool
- [ ] Add liquidity
- [ ] Create demo scenarios

## Configuration

### Environment Variables

```bash
# .env file
PRIVATE_KEY=your_wallet_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
SEPOLIA_RPC=https://rpc.sepolia.org
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
ETHERSCAN_API_KEY=your_api_key
```

### Oracle Configuration

```solidity
// Default base price: $3.50
basePrice = 3.50 * 10**6  // 3.50 USDC (6 decimals)

// Update price via FDC
oracle.updateBasePriceWithFDC(fdcProof);

// Future: Set weather disruption (tracked but not affecting price yet)
oracle.setWeatherDisruptionWithFDC(weatherProof);
```

## Testing Scenarios

### Scenario 1: Winter Demand Spike
```
FDC Oracle: $3.50 → User submits FDC proof with $4.55 (+30% spike)
Pool: $3.50
Expected: Buyers get bonuses, sellers pay fees
Result: Price rises to $4.55
```

### Scenario 2: Speculation Bubble
```
FDC Oracle: $3.50 (verified via FDC)
Pool: $6.30 (degen pump)
Expected: Sellers get massive bonuses, buyers pay high fees
Result: Price crashes to $3.50
```

### Scenario 3: Oversupply
```
FDC Oracle: $3.50 → User submits FDC proof with $2.45 (-30% drop)
Pool: $3.50
Expected: Sellers get bonuses, buyers pay fees
Result: Price falls to $2.45
```

## Tech Stack

- **Smart Contracts**: Solidity 0.8.25
- **Development**: Hardhat 3
- **Testing**: Hardhat + Viem
- **Oracle**: Flare Data Connector (FDC)
- **Frontend**: Next.js 14, wagmi, viem
- **DEX**: Uniswap V4
- **Networks**: Flare Coston2, Base Sepolia

## Key Innovations

1. **Flare FDC Integration**: Decentralized, verifiable price feeds without relying on centralized oracles
2. **Asymmetric Incentives**: Aligned traders earn MORE than market price
3. **Self-Sustaining**: Bonuses funded by misaligned trader fees
4. **Gradual Curves**: Smooth fee and bonus scaling prevents gaming
5. **Real-World Data**: Natural gas prices from verified external APIs

## Contributing

This is a hackathon project for ETHGlobal Buenos Aires 2025.

## License

MIT

## Acknowledgments

- Uniswap V4 for the hooks architecture
- Flare Network for the Data Connector infrastructure
- ETHGlobal for the hackathon opportunity
