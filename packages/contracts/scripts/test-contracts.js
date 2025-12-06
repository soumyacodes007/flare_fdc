const { ethers } = require('ethers');
require('dotenv').config();

const CONTRACTS = {
  FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12',
  COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c',
  WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd',
  INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438',
  POOL_MANAGER: '0x513be19378C375466e29D6b4d001E995FBA8c2ce',
  AGRI_HOOK: '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0',
};

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const WEATHER_ORACLE_ABI = [
  'function basePrice() view returns (uint256)',
  'function getTheoreticalPrice() view returns (uint256)',
  'function updatePriceFromFTSO() external',
  'function currentWeatherEvent() view returns (uint8 eventType, int256 priceImpactPercent, uint256 timestamp, bool active)',
];

const AGRI_HOOK_ABI = [
  'function oracle() view returns (address)',
  'function cachedOraclePrice() view returns (uint256)',
];

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

async function main() {
  console.log('🌾 AGRI-HOOK CONTRACT TESTING\n');
  console.log('📍 Network: Flare Coston2 Testnet');
  console.log('👤 Wallet:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'C2FLR\n');

  // Test 1: Check Token Contracts
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Token Contracts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const fbtc = new ethers.Contract(CONTRACTS.FBTC, ERC20_ABI, provider);
  const coffee = new ethers.Contract(CONTRACTS.COFFEE, ERC20_ABI, provider);

  console.log('MockFBTC:');
  console.log('  Name:', await fbtc.name());
  console.log('  Symbol:', await fbtc.symbol());
  console.log('  Decimals:', await fbtc.decimals());
  console.log('  Total Supply:', ethers.formatUnits(await fbtc.totalSupply(), 9));
  console.log('  Your Balance:', ethers.formatUnits(await fbtc.balanceOf(wallet.address), 9));

  console.log('\nCoffeeToken:');
  console.log('  Name:', await coffee.name());
  console.log('  Symbol:', await coffee.symbol());
  console.log('  Decimals:', await coffee.decimals());
  console.log('  Total Supply:', ethers.formatEther(await coffee.totalSupply()));
  console.log('  Your Balance:', ethers.formatEther(await coffee.balanceOf(wallet.address)));

  // Test 2: Weather Oracle
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Weather Oracle');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const oracle = new ethers.Contract(CONTRACTS.WEATHER_ORACLE, WEATHER_ORACLE_ABI, provider);

  const basePrice = await oracle.basePrice();
  const theoreticalPrice = await oracle.getTheoreticalPrice();
  const weatherEvent = await oracle.currentWeatherEvent();

  console.log('Base Price:', ethers.formatUnits(basePrice, 6), 'USDC');
  console.log('Theoretical Price:', ethers.formatUnits(theoreticalPrice, 6), 'USDC');
  console.log('\nCurrent Weather Event:');
  console.log('  Type:', ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'][Number(weatherEvent.eventType)]);
  console.log('  Price Impact:', weatherEvent.priceImpactPercent.toString() + '%');
  console.log('  Active:', weatherEvent.active);

  // Test 3: Update FTSO Price
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Update FTSO Price');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const oracleWithSigner = oracle.connect(wallet);
    console.log('📡 Fetching price from FTSO...');
    const tx = await oracleWithSigner.updatePriceFromFTSO();
    console.log('Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Price updated! Gas used:', receipt.gasUsed.toString());

    const newBasePrice = await oracle.basePrice();
    console.log('New Base Price:', ethers.formatUnits(newBasePrice, 6), 'USDC');
  } catch (error) {
    console.error('❌ Error updating FTSO price:', error.message);
  }

  // Test 4: AgriHook
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: AgriHook');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const hook = new ethers.Contract(CONTRACTS.AGRI_HOOK, AGRI_HOOK_ABI, provider);

  const hookOracle = await hook.oracle();
  const cachedPrice = await hook.cachedOraclePrice();

  console.log('Hook Oracle Address:', hookOracle);
  console.log('Cached Oracle Price:', ethers.formatUnits(cachedPrice, 6), 'USDC');
  console.log('Oracle Match:', hookOracle.toLowerCase() === CONTRACTS.WEATHER_ORACLE.toLowerCase() ? '✅' : '❌');

  // Test 5: Insurance Vault
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Insurance Vault');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Insurance Vault Address:', CONTRACTS.INSURANCE_VAULT);
  const vaultBalance = await provider.getBalance(CONTRACTS.INSURANCE_VAULT);
  console.log('Vault Balance:', ethers.formatEther(vaultBalance), 'C2FLR');

  console.log('\n✅ All contract tests completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
