const { ethers } = require('ethers');
require('dotenv').config();

const POOL_MANAGER = '0x513be19378C375466e29D6b4d001E995FBA8c2ce';
const COFFEE_TOKEN = '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c';
const FBTC_TOKEN = '0x8C691A99478D3b3fE039f777650C095578debF12';
const AGRI_HOOK = '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const POOL_MANAGER_ABI = [
  'function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function main() {
  console.log('🏊 INITIALIZING LIQUIDITY POOL\n');
  console.log('👤 Deployer:', wallet.address);
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'C2FLR\n');

  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet);
  const coffee = new ethers.Contract(COFFEE_TOKEN, ERC20_ABI, wallet);
  const fbtc = new ethers.Contract(FBTC_TOKEN, ERC20_ABI, wallet);

  // Pool parameters
  const currency0 = COFFEE_TOKEN < FBTC_TOKEN ? COFFEE_TOKEN : FBTC_TOKEN;
  const currency1 = COFFEE_TOKEN < FBTC_TOKEN ? FBTC_TOKEN : COFFEE_TOKEN;
  const fee = 3000; // 0.3%
  const tickSpacing = 60;
  const hooks = AGRI_HOOK;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('POOL CONFIGURATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Currency0 (COFFEE):', currency0);
  console.log('Currency1 (FBTC):', currency1);
  console.log('Fee:', fee / 10000, '%');
  console.log('Tick Spacing:', tickSpacing);
  console.log('Hook:', hooks);

  // Calculate initial price (1 COFFEE = 0.005 FBTC, or 1 FBTC = 200 COFFEE)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = 0.005 (COFFEE per FBTC)
  const price = 0.005;
  const sqrtPrice = Math.sqrt(price);
  const Q96 = 2n ** 96n;
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));

  console.log('\nInitial Price: 1 COFFEE = 0.005 FBTC');
  console.log('sqrtPriceX96:', sqrtPriceX96.toString());

  // Check balances
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TOKEN BALANCES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const coffeeBalance = await coffee.balanceOf(wallet.address);
  const fbtcBalance = await fbtc.balanceOf(wallet.address);

  console.log('COFFEE Balance:', ethers.formatEther(coffeeBalance));
  console.log('FBTC Balance:', ethers.formatEther(fbtcBalance));

  // Approve tokens
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('APPROVE TOKENS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const approveAmount = ethers.parseEther('1000000');

  const coffeeAllowance = await coffee.allowance(wallet.address, POOL_MANAGER);
  if (coffeeAllowance < approveAmount) {
    console.log('Approving COFFEE...');
    const tx1 = await coffee.approve(POOL_MANAGER, approveAmount);
    await tx1.wait();
    console.log('✅ COFFEE approved');
  } else {
    console.log('✅ COFFEE already approved');
  }

  const fbtcAllowance = await fbtc.allowance(wallet.address, POOL_MANAGER);
  if (fbtcAllowance < approveAmount) {
    console.log('Approving FBTC...');
    const tx2 = await fbtc.approve(POOL_MANAGER, approveAmount);
    await tx2.wait();
    console.log('✅ FBTC approved');
  } else {
    console.log('✅ FBTC already approved');
  }

  // Initialize pool
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('INITIALIZE POOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const poolKey = {
      currency0: currency0,
      currency1: currency1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: hooks,
    };

    console.log('Initializing pool...');
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, '0x');
    console.log('⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Pool initialized! Gas used:', receipt.gasUsed.toString());

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Pool initialized with:');
    console.log('  COFFEE/FBTC pair');
    console.log('  Initial price: 1 COFFEE = 0.005 FBTC');
    console.log('  Fee: 0.3%');
    console.log('  Hook: AgriHook');
    console.log('\n📝 Next step: Add liquidity to the pool');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    if (error.data) {
      console.error('Data:', error.data);
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
