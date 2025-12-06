const { ethers } = require('ethers');
require('dotenv').config();

const POOL_MANAGER = '0x7aeaA5d134fd8875366623ff9D394d3F2C0Af0Df';
const COFFEE_TOKEN = '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c';
const FBTC_TOKEN = '0x8C691A99478D3b3fE039f777650C095578debF12';
const AGRI_HOOK = '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0';
const WEATHER_ORACLE = '0x223163b9109e43BdA9d719DF1e7E584d781b93fd';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const POOL_MANAGER_ABI = [
  'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (tuple(int128 amount0, int128 amount1))',
  'function getPool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (tuple(bool initialized, uint160 sqrtPriceX96, int24 tick, uint128 liquidity))',
];

const ORACLE_ABI = [
  'function basePrice() view returns (uint256)',
  'function getTheoreticalPrice() view returns (uint256)',
  'function currentWeatherEvent() view returns (uint8 eventType, int256 priceImpactPercent, uint256 timestamp, bool active)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function main() {
  const swapType = process.argv[2] || 'buy'; // 'buy' or 'sell'
  const amount = process.argv[3] || '1'; // Amount in COFFEE

  console.log('🔄 TESTING SWAP MECHANICS\n');
  console.log('👤 Trader:', wallet.address);
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'C2FLR');
  console.log('📊 Swap Type:', swapType.toUpperCase());
  console.log('💵 Amount:', amount, 'COFFEE\n');

  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet);
  const oracle = new ethers.Contract(WEATHER_ORACLE, ORACLE_ABI, provider);
  const coffee = new ethers.Contract(COFFEE_TOKEN, ERC20_ABI, wallet);
  const fbtc = new ethers.Contract(FBTC_TOKEN, ERC20_ABI, wallet);

  // Check oracle prices
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ORACLE STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const basePrice = await oracle.basePrice();
  const theoreticalPrice = await oracle.getTheoreticalPrice();
  const weatherEvent = await oracle.currentWeatherEvent();

  console.log('Base Price:', ethers.formatUnits(basePrice, 6), 'USDC');
  console.log('Theoretical Price:', ethers.formatUnits(theoreticalPrice, 6), 'USDC');
  console.log('Weather Event:', ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'][Number(weatherEvent.eventType)]);
  console.log('Price Impact:', weatherEvent.priceImpactPercent.toString() + '%');

  const deviation = ((Number(theoreticalPrice) - Number(basePrice)) / Number(basePrice)) * 100;
  console.log('Price Deviation:', deviation.toFixed(2) + '%');

  // Determine if trader is aligned
  const isBuying = swapType === 'buy';
  const poolPriceTooLow = deviation > 0; // Theoretical > Base means pool is underpriced
  const isAligned = poolPriceTooLow ? isBuying : !isBuying;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRADER ALIGNMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Pool Status:', poolPriceTooLow ? 'Underpriced' : 'Overpriced');
  console.log('Trader Action:', isBuying ? 'Buying COFFEE' : 'Selling COFFEE');
  console.log('Alignment:', isAligned ? '✅ ALIGNED (helping fix price)' : '❌ MISALIGNED (exploiting gap)');

  if (isAligned) {
    console.log('Expected Fee: 0.01%');
    if (Math.abs(deviation) >= 50 && Math.abs(deviation) < 100) {
      const bonusRate = Math.min((Math.abs(deviation) ** 2 * 5) / 10000, 5);
      console.log('Expected Bonus:', bonusRate.toFixed(2) + '%');
    }
  } else {
    const absDeviation = Math.abs(deviation);
    const misalignedFee = Math.min(0.3 + (absDeviation * absDeviation * 10 / 10000), 10);
    console.log('Expected Fee:', misalignedFee.toFixed(2) + '%');
  }

  // Check balances
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BALANCES BEFORE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const coffeeBefore = await coffee.balanceOf(wallet.address);
  const fbtcBefore = await fbtc.balanceOf(wallet.address);

  console.log('COFFEE:', ethers.formatEther(coffeeBefore));
  console.log('FBTC:', ethers.formatEther(fbtcBefore));

  // Approve tokens
  const approveAmount = ethers.parseEther('1000000');
  const tokenToApprove = isBuying ? fbtc : coffee;
  const tokenName = isBuying ? 'FBTC' : 'COFFEE';

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('APPROVE ' + tokenName);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allowance = await tokenToApprove.allowance(wallet.address, POOL_MANAGER);
  if (allowance < approveAmount) {
    console.log('Approving', tokenName + '...');
    const approveTx = await tokenToApprove.approve(POOL_MANAGER, approveAmount);
    await approveTx.wait();
    console.log('✅', tokenName, 'approved');
  } else {
    console.log('✅', tokenName, 'already approved');
  }

  // Execute swap
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EXECUTE SWAP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const currency0 = COFFEE_TOKEN < FBTC_TOKEN ? COFFEE_TOKEN : FBTC_TOKEN;
    const currency1 = COFFEE_TOKEN < FBTC_TOKEN ? FBTC_TOKEN : COFFEE_TOKEN;

    const poolKey = {
      currency0: currency0,
      currency1: currency1,
      fee: 3000,
      tickSpacing: 60,
      hooks: AGRI_HOOK,
    };

    const zeroForOne = isBuying ? (currency0 === FBTC_TOKEN) : (currency0 === COFFEE_TOKEN);
    const amountSpecified = ethers.parseEther(amount);
    const sqrtPriceLimitX96 = zeroForOne ? 4295128739n : 1461446703485210103287273052203988822378723970342n;

    const swapParams = {
      zeroForOne: zeroForOne,
      amountSpecified: amountSpecified,
      sqrtPriceLimitX96: sqrtPriceLimitX96,
    };

    console.log('Swapping', amount, isBuying ? 'FBTC for COFFEE' : 'COFFEE for FBTC');
    const tx = await poolManager.swap(poolKey, swapParams, '0x');
    console.log('⏳ Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Swap executed! Gas used:', receipt.gasUsed.toString());

    // Check balances after
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BALANCES AFTER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const coffeeAfter = await coffee.balanceOf(wallet.address);
    const fbtcAfter = await fbtc.balanceOf(wallet.address);

    console.log('COFFEE:', ethers.formatEther(coffeeAfter));
    console.log('FBTC:', ethers.formatEther(fbtcAfter));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHANGES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const coffeeDelta = coffeeAfter - coffeeBefore;
    const fbtcDelta = fbtcAfter - fbtcBefore;

    console.log('COFFEE:', coffeeDelta > 0 ? '+' : '', ethers.formatEther(coffeeDelta));
    console.log('FBTC:', fbtcDelta > 0 ? '+' : '', ethers.formatEther(fbtcDelta));

    console.log('\n✅ Swap completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
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
