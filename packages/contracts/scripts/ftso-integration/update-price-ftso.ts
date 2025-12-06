/**
 * Update Price from FTSO (Flare Time Series Oracle)
 * Fetches real-time price data from Flare's decentralized oracle
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const COSTON2_RPC = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WEATHER_ORACLE_ADDRESS = process.env.WEATHER_ORACLE_ADDRESS;

// WeatherOracleWithFTSO ABI
const ORACLE_ABI = [
  'function updatePriceFromFTSO() external',
  'function configureFTSO(string memory _symbol, uint256 _ratio, bool _enabled) external',
  'function getCurrentFTSOPrice() external view returns (uint256 price, uint256 timestamp, uint256 decimals)',
  'function getAvailableFTSOSymbols() external view returns (string[] memory)',
  'function basePrice() external view returns (uint256)',
  'function ftsoSymbol() external view returns (string)',
  'function ftsoToCoffeeRatio() external view returns (uint256)',
  'function useFTSO() external view returns (bool)',
  'function getTheoreticalPrice() external view returns (uint256)',
  'function owner() external view returns (address)'
];

async function getStatus() {
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS!, ORACLE_ABI, provider);

  console.log('📊 FTSO STATUS:\n');

  const symbol = await oracle.ftsoSymbol();
  const ratio = await oracle.ftsoToCoffeeRatio();
  const enabled = await oracle.useFTSO();
  const basePrice = await oracle.basePrice();
  const theoreticalPrice = await oracle.getTheoreticalPrice();

  console.log(`   Symbol:           ${symbol}`);
  console.log(`   Ratio:            1 ${symbol} = ${ratio} bags`);
  console.log(`   FTSO Enabled:     ${enabled}`);
  console.log(`   Base Price:       ${ethers.formatUnits(basePrice, 18)} FBTC`);
  console.log(`   Theoretical:      ${ethers.formatUnits(theoreticalPrice, 18)} FBTC\n`);

  try {
    const [price, timestamp, decimals] = await oracle.getCurrentFTSOPrice();
    console.log(`   Current FTSO Price:`);
    console.log(`     Price:          ${ethers.formatUnits(price, Number(decimals))} USD`);
    console.log(`     Timestamp:      ${new Date(Number(timestamp) * 1000).toISOString()}`);
    console.log(`     Decimals:       ${decimals}\n`);
  } catch (e) {
    console.log(`   Current FTSO Price: Unable to fetch\n`);
  }

  try {
    const symbols = await oracle.getAvailableFTSOSymbols();
    console.log(`   Available Symbols: ${symbols.join(', ')}\n`);
  } catch (e) {
    console.log(`   Available Symbols: Unable to fetch\n`);
  }
}

async function updatePrice() {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  if (!WEATHER_ORACLE_ADDRESS) throw new Error('WEATHER_ORACLE_ADDRESS not set');

  console.log('🔗 Connecting to Coston2...');
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`   Signer: ${signer.address}`);

  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS, ORACLE_ABI, signer);
  console.log(`   Oracle: ${WEATHER_ORACLE_ADDRESS}\n`);

  // Check if FTSO is enabled
  const enabled = await oracle.useFTSO();
  if (!enabled) {
    console.log('⚠️  FTSO is disabled. Enable it first with:');
    console.log('   npx ts-node scripts/ftso-integration/update-price-ftso.ts configure BTC 10000 true\n');
    return;
  }

  const oldPrice = await oracle.basePrice();
  console.log(`📈 Current Price: ${ethers.formatUnits(oldPrice, 18)} FBTC`);

  console.log('\n📝 Updating price from FTSO...');
  const tx = await oracle.updatePriceFromFTSO({ gasLimit: 500000 });
  console.log(`   TX Hash: ${tx.hash}`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}\n`);

  const newPrice = await oracle.basePrice();
  console.log(`📈 New Price: ${ethers.formatUnits(newPrice, 18)} FBTC`);
  
  const change = ((Number(newPrice) - Number(oldPrice)) / Number(oldPrice) * 100).toFixed(2);
  console.log(`   Change: ${change}%\n`);
}

async function configure(symbol: string, ratio: number, enabled: boolean) {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  if (!WEATHER_ORACLE_ADDRESS) throw new Error('WEATHER_ORACLE_ADDRESS not set');

  console.log('🔗 Connecting to Coston2...');
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS, ORACLE_ABI, signer);

  console.log(`\n⚙️  Configuring FTSO:`);
  console.log(`   Symbol:  ${symbol}`);
  console.log(`   Ratio:   1 ${symbol} = ${ratio} bags`);
  console.log(`   Enabled: ${enabled}\n`);

  const tx = await oracle.configureFTSO(symbol, ratio, enabled);
  console.log(`   TX Hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}\n`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           FTSO PRICE UPDATE INTEGRATION              ');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!WEATHER_ORACLE_ADDRESS) {
    console.error('❌ WEATHER_ORACLE_ADDRESS not set in .env');
    process.exit(1);
  }

  const command = process.argv[2] || 'status';

  if (command === 'status') {
    await getStatus();
  } else if (command === 'update') {
    await updatePrice();
  } else if (command === 'configure') {
    const symbol = process.argv[3] || 'BTC';
    const ratio = parseInt(process.argv[4] || '10000');
    const enabled = process.argv[5] !== 'false';
    await configure(symbol, ratio, enabled);
  } else {
    console.log('USAGE:');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts status');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts update');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts configure <symbol> <ratio> <enabled>');
    console.log();
    console.log('EXAMPLES:');
    console.log('  # Check FTSO status');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts status');
    console.log();
    console.log('  # Update price from FTSO');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts update');
    console.log();
    console.log('  # Configure FTSO (BTC as proxy, 1 BTC = 10000 bags)');
    console.log('  npx ts-node scripts/ftso-integration/update-price-ftso.ts configure BTC 10000 true');
  }
}

main().catch(console.error);
