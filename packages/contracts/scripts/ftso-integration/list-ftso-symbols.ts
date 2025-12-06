/**
 * List Available FTSO Symbols on Coston2
 * Shows all price feeds available from Flare's FTSO
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const COSTON2_RPC = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019';

// Contract Registry ABI
const CONTRACT_REGISTRY_ABI = [
  'function getContractAddressByName(string memory _name) external view returns (address)'
];

// FTSO Registry ABI (minimal)
const FTSO_REGISTRY_ABI = [
  'function getSupportedSymbols() external view returns (string[] memory)',
  'function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _assetPriceUsdDecimals)'
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           FTSO AVAILABLE SYMBOLS (COSTON2)           ');
  console.log('═══════════════════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  
  // Get FTSO Registry address from Contract Registry
  const contractRegistry = new ethers.Contract(CONTRACT_REGISTRY, CONTRACT_REGISTRY_ABI, provider);
  const ftsoRegistryAddress = await contractRegistry.getContractAddressByName('FtsoRegistry');
  
  console.log(`📍 Contract Registry: ${CONTRACT_REGISTRY}`);
  console.log(`📍 FTSO Registry: ${ftsoRegistryAddress}\n`);
  
  const registry = new ethers.Contract(ftsoRegistryAddress, FTSO_REGISTRY_ABI, provider);

  try {
    const symbols = await registry.getSupportedSymbols();
    
    console.log(`📊 AVAILABLE PRICE FEEDS (${symbols.length} total):\n`);
    console.log('   Symbol      Price (USD)         Last Updated');
    console.log('   ─────────────────────────────────────────────────');

    for (const symbol of symbols) {
      try {
        const [price, timestamp, decimals] = await registry.getCurrentPriceWithDecimals(symbol);
        const priceFormatted = ethers.formatUnits(price, Number(decimals));
        const date = new Date(Number(timestamp) * 1000);
        const timeStr = date.toLocaleTimeString();
        
        console.log(`   ${symbol.padEnd(10)} $${parseFloat(priceFormatted).toFixed(4).padStart(12)}    ${timeStr}`);
      } catch (e) {
        console.log(`   ${symbol.padEnd(10)} (unavailable)`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                  RECOMMENDED FOR AGRI-HOOK            ');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   BTC  - Use as proxy for coffee commodity pricing');
    console.log('   ETH  - Alternative proxy asset');
    console.log('   XRP  - Lower volatility option');
    console.log('   FLR  - Native Flare token\n');

    console.log('📝 To configure FTSO in WeatherOracle:');
    console.log('   npx ts-node scripts/ftso-integration/update-price-ftso.ts configure BTC 10000 true\n');

  } catch (error) {
    console.error('❌ Error fetching FTSO data:', (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);
