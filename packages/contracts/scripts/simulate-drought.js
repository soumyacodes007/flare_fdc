const { ethers } = require('ethers');
require('dotenv').config();

const WEATHER_ORACLE = '0x223163b9109e43BdA9d719DF1e7E584d781b93fd';
const INSURANCE_VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORACLE_ABI = [
  'function updateWeatherSimple(uint256 policyId, int256 latitude, int256 longitude) external',
  'function currentWeatherEvent() view returns (uint8 eventType, int256 priceImpactPercent, uint256 timestamp, bool active)',
  'function getTheoreticalPrice() view returns (uint256)',
  'function basePrice() view returns (uint256)',
];

const VAULT_ABI = [
  'function policies(address) view returns (address farmer, int256 latitude, int256 longitude, bytes32 regionHash, uint256 coverageAmount, uint256 premiumPaid, uint256 startTime, uint256 endTime, bool active, bool claimed)',
  'function checkClaimEligibility(address farmer) view returns (bool)',
];

async function main() {
  const farmerAddress = process.argv[2] || wallet.address;

  console.log('🌵 SIMULATING DROUGHT EVENT\n');
  console.log('👤 Farmer:', farmerAddress);
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'C2FLR\n');

  const oracle = new ethers.Contract(WEATHER_ORACLE, ORACLE_ABI, wallet);
  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, provider);

  // Get policy details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Get Policy Details');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const policy = await vault.policies(farmerAddress);
    
    if (!policy.active) {
      console.error('❌ No active policy found for this address');
      process.exit(1);
    }

    console.log('Farmer:', policy.farmer);
    console.log('Location:', policy.latitude.toString(), ',', policy.longitude.toString());
    console.log('Coverage:', ethers.formatUnits(policy.coverageAmount, 6), 'USDC');
    console.log('Active:', policy.active);
    console.log('Claimed:', policy.claimed);

    if (policy.claimed) {
      console.error('\n❌ Policy already claimed');
      process.exit(1);
    }

    // Check current weather event
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Current Weather Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const weatherEvent = await oracle.currentWeatherEvent();
    const basePrice = await oracle.basePrice();
    const theoreticalPrice = await oracle.getTheoreticalPrice();

    console.log('Base Price:', ethers.formatUnits(basePrice, 6), 'USDC');
    console.log('Theoretical Price:', ethers.formatUnits(theoreticalPrice, 6), 'USDC');
    console.log('Current Event:', ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'][Number(weatherEvent.eventType)]);
    console.log('Price Impact:', weatherEvent.priceImpactPercent.toString() + '%');
    console.log('Active:', weatherEvent.active);

    // Simulate drought
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Simulate Drought');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📡 Updating weather data for policy location...');
    console.log('   Latitude:', policy.latitude.toString());
    console.log('   Longitude:', policy.longitude.toString());
    console.log('\n⚠️  This will simulate: 0mm rainfall (severe drought)');

    const tx = await oracle.updateWeatherSimple(0, policy.latitude, policy.longitude);
    console.log('\n⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Weather updated! Gas used:', receipt.gasUsed.toString());

    // Check new weather event
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: New Weather Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const newWeatherEvent = await oracle.currentWeatherEvent();
    const newTheoreticalPrice = await oracle.getTheoreticalPrice();

    console.log('New Theoretical Price:', ethers.formatUnits(newTheoreticalPrice, 6), 'USDC');
    console.log('New Event:', ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'][Number(newWeatherEvent.eventType)]);
    console.log('Price Impact:', newWeatherEvent.priceImpactPercent.toString() + '%');
    console.log('Active:', newWeatherEvent.active);

    const priceIncrease = ((Number(newTheoreticalPrice) - Number(basePrice)) / Number(basePrice)) * 100;
    console.log('\n📊 Price Change:', priceIncrease.toFixed(2) + '%');

    // Check claim eligibility
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Check Claim Eligibility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const eligible = await vault.checkClaimEligibility(farmerAddress);
    console.log('Claim Eligible:', eligible ? '✅ YES' : '❌ NO');

    if (eligible) {
      console.log('\n✅ Drought simulation successful!');
      console.log('\n📝 Next step:');
      console.log('   Process claim: node scripts/process-claim.js', farmerAddress);
    } else {
      console.log('\n⚠️  Policy not eligible for claim yet');
      console.log('   Possible reasons:');
      console.log('   - Weather conditions not severe enough');
      console.log('   - Policy waiting period not elapsed');
      console.log('   - Policy already claimed');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
