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
  'function fundTreasury() external payable',
  'function treasuryBalance() view returns (uint256)',
];

async function main() {
  const amount = process.argv[2] || '10'; // Default 10 C2FLR

  console.log('💰 FUNDING INSURANCE TREASURY\n');
  console.log('👤 Funder:', wallet.address);
  console.log('💵 Amount:', amount, 'C2FLR');
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Your Balance:', ethers.formatEther(balance), 'C2FLR\n');

  const vault = new ethers.Contract(INSURANCE_VAULT, VAULT_ABI, wallet);
  const treasuryBefore = await vault.treasuryBalance();
  console.log('Treasury Balance Before:', ethers.formatEther(treasuryBefore), 'C2FLR\n');

  try {
    const fundAmount = ethers.parseEther(amount);
    
    console.log('📝 Funding treasury...');
    const tx = await vault.fundTreasury({ value: fundAmount });

    console.log('⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Treasury funded! Gas used:', receipt.gasUsed.toString());

    const treasuryAfter = await vault.treasuryBalance();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Treasury Balance Before:', ethers.formatEther(treasuryBefore), 'C2FLR');
    console.log('Treasury Balance After:', ethers.formatEther(treasuryAfter), 'C2FLR');
    console.log('Amount Added:', ethers.formatEther(treasuryAfter - treasuryBefore), 'C2FLR');

    console.log('\n✅ Treasury funded successfully!');
    console.log('📝 Now you can process claims');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
