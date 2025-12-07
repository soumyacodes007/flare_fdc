const { ethers } = require('ethers');

const VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';
const provider = new ethers.JsonRpcProvider('https://coston2-api.flare.network/ext/C/rpc');

const ABI = [
  'function treasuryBalance() view returns (uint256)',
  'function calculatePremium(uint256 coverageAmount, bytes32 regionHash) view returns (uint256)',
  'function calculateRegionHash(int256 latitude, int256 longitude) pure returns (bytes32)',
  'function policies(address) view returns (address, int256, int256, bytes32, uint256, uint256, uint256, uint256, bool, bool)',
  'function MIN_COVERAGE() view returns (uint256)',
  'function MAX_COVERAGE() view returns (uint256)'
];

const vault = new ethers.Contract(VAULT, ABI, provider);

async function check() {
  console.log('=== Insurance Vault Status ===\n');
  
  const treasury = await vault.treasuryBalance();
  console.log('Treasury Balance:', ethers.formatEther(treasury), 'C2FLR');
  
  const minCoverage = await vault.MIN_COVERAGE();
  const maxCoverage = await vault.MAX_COVERAGE();
  console.log('Min Coverage:', Number(minCoverage) / 1e6, 'USD');
  console.log('Max Coverage:', Number(maxCoverage) / 1e6, 'USD');
  
  const regionHash = await vault.calculateRegionHash(-18512200n, -44555000n);
  console.log('\nRegion Hash (Minas Gerais):', regionHash);
  
  // Calculate premium for $5000 coverage
  const coverageAmount = 5000n * 1000000n; // $5000 in 6 decimals
  const premium = await vault.calculatePremium(coverageAmount, regionHash);
  console.log('Premium for $5000 coverage:', ethers.formatEther(premium), 'C2FLR');
  
  // Check user policy
  const userAddress = '0x29919C437FFE89fCFF8F95930917d645792a196A';
  const policy = await vault.policies(userAddress);
  console.log('\n=== User Policy ===');
  console.log('Address:', userAddress);
  console.log('Active:', policy[8]);
  console.log('Claimed:', policy[9]);
  console.log('Coverage:', Number(policy[4]) / 1e6, 'USD');
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
