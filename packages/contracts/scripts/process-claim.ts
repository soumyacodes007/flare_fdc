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
  'function policies(uint256) view returns (address farmer, int256 latitude, int256 longitude, uint256 premiumPaid, uint256 coverageAmount, bool active, bool claimed)',
  'function checkClaimEligibility(uint256 policyId) view returns (bool)',
  'function processClaim(uint256 policyId) external',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

async function main() {
  const args = process.argv.slice(2);
  const policyId = args[0];

  if (!policyId) {
    console.error('❌ Usage: npm run claim <policyId>');
    process.exit(1);
  }

  console.log('💰 PROCESSING INSURANCE CLAIM\n');
  console.log('📍 Policy ID:', policyId);
  console.log('👤 Wallet:', wallet.address);
  console.log('💵 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'C2FLR\n');

  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, wallet);
  const fbtc = new ethers.Contract(FBTC_ADDRESS, ERC20_ABI, provider);

  // Get policy details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Verify Policy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const policy = await vault.policies(policyId);
    console.log('Farmer:', policy.farmer);
    console.log('Location:', policy.latitude.toString(), ',', policy.longitude.toString());
    console.log('Premium Paid:', ethers.formatUnits(policy.premiumPaid, 9), 'FBTC');
    console.log('Coverage:', ethers.formatUnits(policy.coverageAmount, 9), 'FBTC');
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

    // Check eligibility
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Check Eligibility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const eligible = await vault.checkClaimEligibility(policyId);
    console.log('Claim Eligible:', eligible ? '✅ YES' : '❌ NO');

    if (!eligible) {
      console.error('\n❌ Policy not eligible for claim');
      console.log('   Possible reasons:');
      console.log('   - Weather conditions not severe enough');
      console.log('   - Waiting period not elapsed');
      console.log('   - Policy already claimed or inactive');
      process.exit(1);
    }

    // Get balance before
    const balanceBefore = await fbtc.balanceOf(wallet.address);
    console.log('\nFBTC Balance Before:', ethers.formatUnits(balanceBefore, 9), 'FBTC');

    // Process claim
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Process Claim');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Processing claim...');
    const tx = await vault.processClaim(policyId);
    console.log('⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Claim processed! Gas used:', receipt.gasUsed.toString());

    // Get balance after
    const balanceAfter = await fbtc.balanceOf(wallet.address);
    const payout = balanceAfter - balanceBefore;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLAIM SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('FBTC Balance Before:', ethers.formatUnits(balanceBefore, 9), 'FBTC');
    console.log('FBTC Balance After:', ethers.formatUnits(balanceAfter, 9), 'FBTC');
    console.log('Payout Received:', ethers.formatUnits(payout, 9), 'FBTC');

    // Verify policy is now claimed
    const updatedPolicy = await vault.policies(policyId);
    console.log('\nPolicy Status:');
    console.log('  Active:', updatedPolicy.active);
    console.log('  Claimed:', updatedPolicy.claimed);

    console.log('\n✅ Claim processed successfully!');
    console.log('💰 You received', ethers.formatUnits(payout, 9), 'FBTC');
  } catch (error: any) {
    console.error('\n❌ Error processing claim:', error.message);
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
