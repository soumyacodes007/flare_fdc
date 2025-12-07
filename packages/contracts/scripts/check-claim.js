const { ethers } = require('ethers');

const VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';
const USER = '0x29919C437FFE89fCFF8F95930917d645792a196A';
const provider = new ethers.JsonRpcProvider('https://coston2-api.flare.network/ext/C/rpc');

const ABI = [
  'function treasuryBalance() view returns (uint256)',
  'function policies(address) view returns (address, int256, int256, bytes32, uint256, uint256, uint256, uint256, bool, bool)',
];

async function check() {
  const vault = new ethers.Contract(VAULT, ABI, provider);
  
  const treasury = await vault.treasuryBalance();
  console.log('Treasury Balance:', ethers.formatEther(treasury), 'C2FLR');
  console.log('Treasury (wei):', treasury.toString());
  
  const policy = await vault.policies(USER);
  const coverageAmount = policy[4];
  const active = policy[8];
  const claimed = policy[9];
  
  console.log('\nPolicy Status:');
  console.log('- Active:', active);
  console.log('- Claimed:', claimed);
  console.log('- Coverage (raw):', coverageAmount.toString());
  console.log('- Coverage (USD):', Number(coverageAmount) / 1e6, 'USD');
  
  // Payout calculation
  const payoutAmount = coverageAmount / 2n;
  console.log('\nPayout Calculation:');
  console.log('- Payout (raw):', payoutAmount.toString());
  console.log('- Payout (C2FLR):', ethers.formatEther(payoutAmount));
  
  console.log('\nCan claim?', treasury >= payoutAmount ? 'YES' : 'NO - Insufficient treasury');
}

check().catch(console.error);
