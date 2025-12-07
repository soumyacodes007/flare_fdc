/**
 * AgriHook Transaction Test Script
 * Tests real on-chain interactions with the AgriHook contract on Coston2
 * 
 * Usage: node scripts/test-agrihook-transactions.js
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Contract Addresses (Coston2)
const CONTRACTS = {
  AGRI_HOOK: '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0',
  WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd',
  INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438',
  POOL_MANAGER: '0x513be19378C375466e29D6b4d001E995FBA8c2ce',
  FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12',
  COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c'
};

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';

// ABIs
const HOOK_ABI = [
  'function oracle() view returns (address)',
  'function cachedOraclePrice() view returns (uint256)',
  'function lastPriceUpdate() view returns (uint256)',
  'function poolPrice(bytes32) view returns (uint256)',
  'function treasuryBalance(bytes32) view returns (uint256)',
  'function circuitBreakerActive(bytes32) view returns (bool)',
  'function RECOVERY_THRESHOLD() view returns (uint256)',
  'function CIRCUIT_BREAKER_THRESHOLD() view returns (uint256)',
  'function ALIGNED_FEE() view returns (uint24)',
  'function BASE_FEE() view returns (uint24)',
  'function MAX_MISALIGNED_FEE() view returns (uint24)',
  'function MAX_BONUS_RATE() view returns (uint256)',
  'function getHookPermissions() view returns (tuple(bool beforeInitialize, bool afterInitialize, bool beforeAddLiquidity, bool afterAddLiquidity, bool beforeRemoveLiquidity, bool afterRemoveLiquidity, bool beforeSwap, bool afterSwap, bool beforeDonate, bool afterDonate, bool beforeSwapReturnDelta, bool afterSwapReturnDelta, bool afterAddLiquidityReturnDelta, bool afterRemoveLiquidityReturnDelta))',
  'function calculateDeviation(uint256 currentPoolPrice, uint256 theoreticalPrice) view returns (uint256)',
  'function isTraderAligned(uint256 currentPoolPrice, uint256 theoreticalPrice, bool isBuying) view returns (bool)',
  'function getOperatingMode(uint256 deviation) view returns (uint8)',
  'function updatePriceFromOracle(uint256 price, uint256 timestamp)',
  'function setPoolPrice(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 price)',
  'function fundTreasury(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) payable',
  'function getPoolStatus(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (uint256 currentPrice, uint256 oraclePrice, uint256 deviation, uint8 mode, uint256 treasury)',
  'function rebalancePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) payable',
  'event PriceReceivedFromOracle(uint256 price, uint256 timestamp)',
  'event TreasuryFunded(bytes32 indexed poolId, uint256 amount)',
  'event CircuitBreakerTriggered(bytes32 indexed poolId, uint256 deviation)',
  'event ArbitrageCaptured(bytes32 indexed poolId, address indexed trader, uint256 fee)'
];

const ORACLE_ABI = [
  'function basePrice() view returns (uint256)',
  'function getTheoreticalPrice() view returns (uint256)',
  'function currentWeatherEvent() view returns (uint8 eventType, int256 priceImpactPercent, uint256 timestamp, bool active)',
  'function updateWeatherSimple(uint256 rainfall, int256 latitude, int256 longitude)',
  'function updatePriceFromFTSO()',
  'function getCurrentFTSOPrice() view returns (uint256 price, uint256 timestamp, uint256 decimals)'
];

// Test Results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${msg}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`  ✅ ${name}`, 'success');
  } else {
    results.failed++;
    log(`  ❌ ${name}: ${details}`, 'error');
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════════════════════', 'info');
  log('       AGRIHOOK TRANSACTION TEST SUITE', 'info');
  log('       Network: Flare Coston2 Testnet', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');

  // Setup provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  let signer = null;
  let canWrite = false;

  if (privateKey && privateKey !== 'your_private_key_here') {
    signer = new ethers.Wallet(privateKey, provider);
    canWrite = true;
    log(`Wallet: ${signer.address}`, 'info');
    const balance = await provider.getBalance(signer.address);
    log(`Balance: ${ethers.formatEther(balance)} C2FLR\n`, 'info');
  } else {
    log('⚠️  No PRIVATE_KEY found - running read-only tests\n', 'warning');
  }

  const hook = new ethers.Contract(CONTRACTS.AGRI_HOOK, HOOK_ABI, signer || provider);
  const oracle = new ethers.Contract(CONTRACTS.WEATHER_ORACLE, ORACLE_ABI, signer || provider);

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Contract Deployment Verification
  // ═══════════════════════════════════════════════════════════════
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST 1: Contract Deployment Verification', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

  try {
    const hookCode = await provider.getCode(CONTRACTS.AGRI_HOOK);
    logTest('AgriHook deployed', hookCode !== '0x', hookCode === '0x' ? 'No code at address' : '');

    const oracleCode = await provider.getCode(CONTRACTS.WEATHER_ORACLE);
    logTest('WeatherOracle deployed', oracleCode !== '0x', oracleCode === '0x' ? 'No code at address' : '');

    const vaultCode = await provider.getCode(CONTRACTS.INSURANCE_VAULT);
    logTest('InsuranceVault deployed', vaultCode !== '0x', vaultCode === '0x' ? 'No code at address' : '');
  } catch (e) {
    logTest('Contract deployment check', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Hook Configuration
  // ═══════════════════════════════════════════════════════════════
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST 2: Hook Configuration', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

  try {
    const hookOracle = await hook.oracle();
    logTest('Oracle address correct', hookOracle.toLowerCase() === CONTRACTS.WEATHER_ORACLE.toLowerCase());

    const permissions = await hook.getHookPermissions();
    logTest('beforeSwap enabled', permissions.beforeSwap === true);
    logTest('afterSwap enabled', permissions.afterSwap === true);
    logTest('beforeInitialize disabled', permissions.beforeInitialize === false);

    const recoveryThreshold = await hook.RECOVERY_THRESHOLD();
    logTest('Recovery threshold = 50%', recoveryThreshold.toString() === '50');

    const circuitBreakerThreshold = await hook.CIRCUIT_BREAKER_THRESHOLD();
    logTest('Circuit breaker threshold = 100%', circuitBreakerThreshold.toString() === '100');

    const alignedFee = await hook.ALIGNED_FEE();
    logTest('Aligned fee = 0.01%', alignedFee.toString() === '10'); // 10 = 0.01% in basis points

    const baseFee = await hook.BASE_FEE();
    logTest('Base fee = 0.3%', baseFee.toString() === '3000'); // 3000 = 0.3%

    const maxFee = await hook.MAX_MISALIGNED_FEE();
    logTest('Max misaligned fee = 10%', maxFee.toString() === '100000'); // 100000 = 10%

    const maxBonus = await hook.MAX_BONUS_RATE();
    logTest('Max bonus rate = 5%', maxBonus.toString() === '500'); // 500 = 5%
  } catch (e) {
    logTest('Hook configuration', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Oracle Integration
  // ═══════════════════════════════════════════════════════════════
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST 3: Oracle Integration', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

  try {
    const cachedPrice = await hook.cachedOraclePrice();
    log(`  Cached Oracle Price: ${ethers.formatEther(cachedPrice)} ETH`, 'info');
    logTest('Cached price > 0', cachedPrice > 0n);

    const lastUpdate = await hook.lastPriceUpdate();
    log(`  Last Price Update: ${new Date(Number(lastUpdate) * 1000).toISOString()}`, 'info');
    logTest('Price has been updated', lastUpdate > 0n);

    const basePrice = await oracle.basePrice();
    log(`  Oracle Base Price: ${ethers.formatEther(basePrice)} ETH`, 'info');
    logTest('Oracle base price > 0', basePrice > 0n);

    const theoreticalPrice = await oracle.getTheoreticalPrice();
    log(`  Theoretical Price: ${ethers.formatEther(theoreticalPrice)} ETH`, 'info');
    logTest('Theoretical price > 0', theoreticalPrice > 0n);

    const weatherEvent = await oracle.currentWeatherEvent();
    const eventTypes = ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'];
    log(`  Weather Event: ${eventTypes[Number(weatherEvent.eventType)]}`, 'info');
    log(`  Price Impact: ${weatherEvent.priceImpactPercent}%`, 'info');
    log(`  Event Active: ${weatherEvent.active}`, 'info');
    logTest('Weather event readable', true);
  } catch (e) {
    logTest('Oracle integration', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Pure Function Tests (calculateDeviation, isTraderAligned, getOperatingMode)
  // ═══════════════════════════════════════════════════════════════
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST 4: Pure Function Tests', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

  try {
    // Test calculateDeviation
    const deviation1 = await hook.calculateDeviation(ethers.parseEther('100'), ethers.parseEther('100'));
    logTest('Deviation 0% when prices equal', deviation1.toString() === '0');

    const deviation2 = await hook.calculateDeviation(ethers.parseEther('150'), ethers.parseEther('100'));
    logTest('Deviation 50% when pool 50% higher', deviation2.toString() === '50');

    const deviation3 = await hook.calculateDeviation(ethers.parseEther('50'), ethers.parseEther('100'));
    logTest('Deviation 50% when pool 50% lower', deviation3.toString() === '50');

    // Test isTraderAligned
    // Pool price > theoretical: sellers are aligned
    const aligned1 = await hook.isTraderAligned(ethers.parseEther('150'), ethers.parseEther('100'), false);
    logTest('Seller aligned when pool price high', aligned1 === true);

    const aligned2 = await hook.isTraderAligned(ethers.parseEther('150'), ethers.parseEther('100'), true);
    logTest('Buyer misaligned when pool price high', aligned2 === false);

    // Pool price < theoretical: buyers are aligned
    const aligned3 = await hook.isTraderAligned(ethers.parseEther('50'), ethers.parseEther('100'), true);
    logTest('Buyer aligned when pool price low', aligned3 === true);

    const aligned4 = await hook.isTraderAligned(ethers.parseEther('50'), ethers.parseEther('100'), false);
    logTest('Seller misaligned when pool price low', aligned4 === false);

    // Test getOperatingMode
    const mode0 = await hook.getOperatingMode(25n);
    logTest('Normal mode at 25% deviation', mode0.toString() === '0');

    const mode1 = await hook.getOperatingMode(75n);
    logTest('Recovery mode at 75% deviation', mode1.toString() === '1');

    const mode2 = await hook.getOperatingMode(150n);
    logTest('Circuit breaker at 150% deviation', mode2.toString() === '2');
  } catch (e) {
    logTest('Pure function tests', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Write Operations (requires PRIVATE_KEY)
  // ═══════════════════════════════════════════════════════════════
  if (canWrite) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    log('TEST 5: Write Operations', 'info');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

    // Test updatePriceFromOracle
    try {
      const theoreticalPrice = await oracle.getTheoreticalPrice();
      const timestamp = Math.floor(Date.now() / 1000);
      
      log('  Updating price from oracle...', 'info');
      const tx1 = await hook.updatePriceFromOracle(theoreticalPrice, timestamp, { gasLimit: 100000 });
      log(`  TX Hash: ${tx1.hash}`, 'info');
      await tx1.wait();
      
      const newCachedPrice = await hook.cachedOraclePrice();
      logTest('updatePriceFromOracle', newCachedPrice.toString() === theoreticalPrice.toString());
    } catch (e) {
      logTest('updatePriceFromOracle', false, e.message);
    }

    // Test fundTreasury with a mock pool key
    try {
      // Create a pool key (using actual token addresses)
      const poolKey = {
        currency0: CONTRACTS.COFFEE < CONTRACTS.FBTC ? CONTRACTS.COFFEE : CONTRACTS.FBTC,
        currency1: CONTRACTS.COFFEE < CONTRACTS.FBTC ? CONTRACTS.FBTC : CONTRACTS.COFFEE,
        fee: 3000,
        tickSpacing: 60,
        hooks: CONTRACTS.AGRI_HOOK
      };

      log('  Funding treasury with 0.001 C2FLR...', 'info');
      const tx2 = await hook.fundTreasury(poolKey, { 
        value: ethers.parseEther('0.001'),
        gasLimit: 150000 
      });
      log(`  TX Hash: ${tx2.hash}`, 'info');
      await tx2.wait();
      logTest('fundTreasury', true);
    } catch (e) {
      logTest('fundTreasury', false, e.message);
    }

    // Test weather oracle update
    try {
      log('  Simulating drought (0mm rainfall)...', 'info');
      const tx3 = await oracle.updateWeatherSimple(0, -18512200, -44555000, { gasLimit: 200000 });
      log(`  TX Hash: ${tx3.hash}`, 'info');
      await tx3.wait();
      
      const weatherEvent = await oracle.currentWeatherEvent();
      logTest('Drought simulation', weatherEvent.active === true && weatherEvent.eventType.toString() === '1');
    } catch (e) {
      logTest('Drought simulation', false, e.message);
    }

    // Clear weather
    try {
      log('  Clearing weather (25mm rainfall)...', 'info');
      const tx4 = await oracle.updateWeatherSimple(25, -18512200, -44555000, { gasLimit: 200000 });
      log(`  TX Hash: ${tx4.hash}`, 'info');
      await tx4.wait();
      
      const weatherEvent = await oracle.currentWeatherEvent();
      logTest('Weather cleared', weatherEvent.active === false);
    } catch (e) {
      logTest('Weather cleared', false, e.message);
    }
  } else {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'warning');
    log('TEST 5: Write Operations - SKIPPED (no PRIVATE_KEY)', 'warning');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'warning');
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Hook Address Validation (Uniswap V4 flags)
  // ═══════════════════════════════════════════════════════════════
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TEST 6: Hook Address Validation', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info');

  try {
    const hookAddress = BigInt(CONTRACTS.AGRI_HOOK);
    // Uniswap V4 hook flags in lower bits
    const beforeSwapFlag = (hookAddress >> 7n) & 1n;
    const afterSwapFlag = (hookAddress >> 6n) & 1n;

    log(`  Hook Address: ${CONTRACTS.AGRI_HOOK}`, 'info');
    log(`  beforeSwap flag (bit 7): ${beforeSwapFlag === 1n ? 'SET' : 'NOT SET'}`, 'info');
    log(`  afterSwap flag (bit 6): ${afterSwapFlag === 1n ? 'SET' : 'NOT SET'}`, 'info');

    logTest('beforeSwap flag set in address', beforeSwapFlag === 1n);
    logTest('afterSwap flag set in address', afterSwapFlag === 1n);
  } catch (e) {
    logTest('Hook address validation', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  log('\n═══════════════════════════════════════════════════════════════', 'info');
  log('                    TEST SUMMARY', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');

  log(`  Total Tests: ${results.passed + results.failed}`, 'info');
  log(`  Passed: ${results.passed}`, 'success');
  log(`  Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');

  if (results.failed > 0) {
    log('\n  Failed Tests:', 'error');
    results.tests.filter(t => !t.passed).forEach(t => {
      log(`    - ${t.name}: ${t.details}`, 'error');
    });
  }

  log('\n═══════════════════════════════════════════════════════════════\n', 'info');

  // Save results to JSON
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/agrihook_test_results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      network: 'coston2',
      contracts: CONTRACTS,
      summary: {
        total: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed
      },
      tests: results.tests
    }, null, 2)
  );
  log('Results saved to scripts/agrihook_test_results.json', 'info');

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
