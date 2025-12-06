const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = 'https://coston2-api.flare.network/ext/C/rpc';
const VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';
const FARMER = '0x750Fc8e72A4b00da9A5C9b116487ABC28360023f';

async function main() {
  console.log('Testing connection...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  const VAULT_ABI = [
    'function policies(address) view returns (address farmer, int256 latitude, int256 longitude, bytes32 regionHash, uint256 coverageAmount, uint256 premiumPaid, uint256 startTime, uint256 endTime, bool active, bool claimed)',
  ];
  
  const vault = new ethers.Contract(VAULT, VAULT_ABI, provider);
  
  console.log('Fetching policy for:', FARMER);
  const policy = await vault.policies(FARMER);
  
  console.log('Farmer:', policy.farmer);
  console.log('Active:', policy.active);
  console.log('Coverage:', ethers.formatUnits(policy.coverageAmount, 6), 'USDC');
  console.log('Latitude:', policy.latitude.toString());
  console.log('Longitude:', policy.longitude.toString());
}

main().catch(console.error);
