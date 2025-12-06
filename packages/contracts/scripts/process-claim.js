const { ethers } = require('ethers');
require('dotenv').config();

const INSURANCE_VAULT = '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const VAULT_ABI = [
  'function policies(address) view returns (address farmer, int256 latitude, int256 longitude, bytes32 regionHash, uint256 coverageAmount, uint256 premiumPaid, uint256 startTime, uint256 endTime, bool active, bool claimed)',
  'function claimPayout() external',
  'function treasuryBalance() view returns (uint256)',
];

async function main() {
  const farmerAddress = wallet.address;

  console.log('💰 PROCESSING INSURANCE CLAIM\n');
  console.log('👤 Farmer:', farmerAddress);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💵 Balance Before:', ethers.formatEther(balance), 'C2FLR\n');

  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, wallet);

  // Get policy details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Verify Policy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const policy = await vault.policies(farmerAddress);
    
    console.log('Farmer:', policy.farmer);
    console.log('Location:', policy.latitude.toString(), ',', policy.longitude.toString());
    console.log('Coverage:', ethers.formatUnits(policy.coverageAmount, 6), 'USDC');
    console.log('Premium Paid:', ethers.formatEther(policy.premiumPaid), 'C2FLR');
    console.log('Active:', policy.active);
    console.log('Claimed:', policy.claimed);

    if (!policy.active) {
      console.error('\n❌ Policy is not active');
      process.exit(1);
    }

    if (policy.claimed) {
      console.error('\n❌ Policy already claimed');
      process.exit(1);
    }

    // Check treasury balance
    const treasuryBalance = await vault.treasuryBalance();
    const expectedPayout = policy.coverageAmount / 2n; // 50% payout
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Check Treasury');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Treasury Balance:', ethers.formatEther(treasuryBalance), 'C2FLR');
    console.log('Expected Payout:', ethers.formatUnits(expectedPayout, 6), 'USDC (50% of coverage)');

    // Process claim
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Process Claim');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Processing claim...');
    const tx = await vault.claimPayout();
    console.log('⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Claim processed! Gas used:', receipt.gasUsed.toString());

    // Get balance after
    const balanceAfter = await provider.getBalance(wallet.address);
    const payout = balanceAfter - balance;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLAIM SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Balance Before:', ethers.formatEther(balance), 'C2FLR');
    console.log('Balance After:', ethers.formatEther(balanceAfter), 'C2FLR');
    console.log('Net Change:', ethers.formatEther(payout), 'C2FLR');

    // Verify policy is now claimed
    const updatedPolicy = await vault.policies(farmerAddress);
    console.log('\nPolicy Status:');
    console.log('  Active:', updatedPolicy.active);
    console.log('  Claimed:', updatedPolicy.claimed);

    console.log('\n✅ Claim processed successfully!');
    console.log('💰 You received a payout for drought conditions');
  } catch (error) {
    console.error('\n❌ Error processing claim:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
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
