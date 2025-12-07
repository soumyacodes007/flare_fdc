export const CONTRACTS = {
  WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd' as `0x${string}`,
  INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438' as `0x${string}`,
  AGRI_HOOK: '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0' as `0x${string}`,
  FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12' as `0x${string}`,
  COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c' as `0x${string}`,
};

export const ORACLE_ABI = [
  {
    name: 'basePrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getTheoreticalPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getCurrentWeatherEvent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'uint8', name: 'eventType' },
      { type: 'int256', name: 'priceImpact' },
      { type: 'uint256', name: 'timestamp' },
      { type: 'bool', name: 'active' },
    ],
  },
  {
    name: 'updateWeatherSimple',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'rainfall' },
      { type: 'int256', name: 'latitude' },
      { type: 'int256', name: 'longitude' },
    ],
    outputs: [],
  },
  {
    name: 'updatePriceFromFTSO',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getCurrentFTSOPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'uint256', name: 'price' },
      { type: 'uint256', name: 'timestamp' },
      { type: 'uint256', name: 'decimals' },
    ],
  },
] as const;

export const VAULT_ABI = [
  {
    name: 'createPolicy',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { type: 'int256', name: 'latitude' },
      { type: 'int256', name: 'longitude' },
      { type: 'uint256', name: 'coverageAmount' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'claimPayout',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'policies',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [
      { type: 'address', name: 'farmer' },
      { type: 'int256', name: 'latitude' },
      { type: 'int256', name: 'longitude' },
      { type: 'bytes32', name: 'regionHash' },
      { type: 'uint256', name: 'coverageAmount' },
      { type: 'uint256', name: 'premiumPaid' },
      { type: 'uint256', name: 'startTime' },
      { type: 'uint256', name: 'endTime' },
      { type: 'bool', name: 'active' },
      { type: 'bool', name: 'claimed' },
    ],
  },
  {
    name: 'treasuryBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'fundTreasury',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
] as const;

export const FBTC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
