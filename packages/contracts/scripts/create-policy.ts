import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const INSURANCE_VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';
const FBTC_ADDRESS = '0x8C691A99478D3b3fE039f777650C095578debF12';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const VAULT_ABI = [
  'function createPolicy(int256 latitude, int256 longitude, uint256 premiumAmount) external payable returns (uint256)',
  'function policies(uint256) view returns (address farmer, int256 latitude, int256 longitude, uint256 premiumPaid, uint256 coverageAmount, bool active, bool claimed)',
  'function policyCount() view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function faucet() external',
];

// Coffee growing regions
const LOCATIONS = {
  minas_gerais: { lat: -18512200, lon: -44555000, name: 'Minas Gerais, Brazil' },
  sao_paulo: { lat: -23550520, lon: -46633308, name: 'São Paulo, Brazil' },
  colombia: { lat: 4710989, lon: -74072092, name: 'Colombia' },
  vietnam: { lat: 12250000, lon: 108000000, name: 'Vietnam' },
  ethiopia: { lat: 9145000, lon: 40489673, name: 'Ethiopia' },
};

async function main() {
  const args = process.argv.slice(2);
  const locationKey = args[0] || 'minas_gerais';
  const premiumFBTC = args[1] || '5'; // 5 FBTC default

  const location = LOCATIONS[locationKey as keyof typeof LOCATIONS];
  if (!location) {
    console.error('❌ Invalid location. Available:', Object.keys(LOCATIONS).join(', '));
    process.exit(1);
  }

  console.log('🌾 CREATING INSURANCE POLICY\n');
  console.log('📍 Location:', location.name);
  console.log('📊 Coordinates:', location.lat / 1e6, ',', location.lon / 1e6);
  console.log('💰 Premium:', premiumFBTC, 'FBTC');
  console.log('👤 Farmer:', wallet.address);
  console.log('💵 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'C2FLR\n');

  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, wallet);
  const fbtc = new ethers.Contract(FBTC_ADDRESS, ERC20_ABI, wallet);

  // Check FBTC balance
  const balance = await fbtc.balanceOf(wallet.address);
  const premiumWei = ethers.parseUnits(premiumFBTC, 9); // FBTC has 9 decimals

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Check FBTC Balance');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Your FBTC Balance:', ethers.formatUnits(balance, 9), 'FBTC');
  console.log('Required Premium:', ethers.formatUnits(premiumWei, 9), 'FBTC');

  if (balance < premiumWei) {
    console.log('\n⚠️  Insufficient FBTC balance. Getting tokens from faucet...');
    try {
      const faucetTx = await fbtc.faucet();
      console.log('Faucet tx:', faucetTx.hash);
      await faucetTx.wait();
      const newBalance = await fbtc.balanceOf(wallet.address);
      console.log('✅ New balance:', ethers.formatUnits(newBalance, 9), 'FBTC');
    } catch (error: any) {
      console.error('❌ Faucet failed:', error.message);
      process.exit(1);
    }
  }

  // Approve FBTC
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Approve FBTC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allowance = await fbtc.allowance(wallet.address, INSURANCE_VAULT);
  console.log('Current Allowance:', ethers.formatUnits(allowance, 9), 'FBTC');

  if (allowance < premiumWei) {
    console.log('📝 Approving FBTC...');
    const approveTx = await fbtc.approve(INSURANCE_VAULT, premiumWei);
    console.log('Approve tx:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ FBTC approved');
  } else {
    console.log('✅ Already approved');
  }

  // Create policy
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Create Policy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const collateral = ethers.parseEther('1'); // 1 C2FLR collateral
    console.log('📝 Creating policy...');
    console.log('   Latitude:', location.lat);
    console.log('   Longitude:', location.lon);
    console.log('   Premium:', ethers.formatUnits(premiumWei, 9), 'FBTC');
    console.log('   Collateral:', ethers.formatEther(collateral), 'C2FLR');

    const tx = await vault.createPolicy(location.lat, location.lon, premiumWei, {
      value: collateral,
    });

    console.log('\n⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Policy created! Gas used:', receipt.gasUsed.toString());

    // Get policy ID from events
    const policyCount = await vault.policyCount();
    const policyId = policyCount - 1n;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('POLICY DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const policy = await vault.policies(policyId);
    console.log('Policy ID:', policyId.toString());
    console.log('Farmer:', policy.farmer);
    console.log('Location:', policy.latitude.toString(), ',', policy.longitude.toString());
    console.log('Premium Paid:', ethers.formatUnits(policy.premiumPaid, 9), 'FBTC');
    console.log('Coverage Amount:', ethers.formatUnits(policy.coverageAmount, 9), 'FBTC');
    console.log('Active:', policy.active);
    console.log('Claimed:', policy.claimed);

    console.log('\n✅ Policy created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Wait for weather data updates');
    console.log('   2. Check claim eligibility: npm run test:claim', policyId.toString());
    console.log('   3. Process claim if eligible: npm run claim', policyId.toString());
  } catch (error: any) {
    console.error('\n❌ Error creating policy:', error.message);
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
