const { ethers } = require('ethers');
require('dotenv').config();

const INSURANCE_VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';
const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const VAULT_ABI = [
  'function policies(address) view returns (address farmer, int256 latitude, int256 longitude, bytes32 regionHash, uint256 coverageAmount, uint256 premiumPaid, uint256 startTime, uint256 endTime, bool active, bool claimed)',
];

async function main() {
  const farmerAddress = process.argv[2] || wallet.address;
  
  console.log('📋 CHECKING POLICY\n');
  console.log('Farmer:', farmerAddress);
  
  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, provider);
  
  try {
    const policy = await vault.policies(farmerAddress);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('POLICY DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Farmer:', policy.farmer);
    console.log('Location:', policy.latitude.toString(), ',', policy.longitude.toString());
    console.log('Region Hash:', policy.regionHash);
    console.log('Coverage Amount:', ethers.formatUnits(policy.coverageAmount, 6), 'USDC');
    console.log('Premium Paid:', ethers.formatEther(policy.premiumPaid), 'C2FLR');
    console.log('Start Time:', new Date(Number(policy.startTime) * 1000).toISOString());
    console.log('End Time:', new Date(Number(policy.endTime) * 1000).toISOString());
    console.log('Active:', policy.active);
    console.log('Claimed:', policy.claimed);
    
    if (!policy.active) {
      console.log('\n⚠️  No active policy found for this address');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
