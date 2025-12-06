/**
 * Submit FDC Proof to WeatherOracle Contract
 * Verifies and submits weather data proof on-chain
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const COSTON2_RPC = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WEATHER_ORACLE_ADDRESS = process.env.WEATHER_ORACLE_ADDRESS;

// WeatherOracle ABI (minimal)
const ORACLE_ABI = [
  'function setWeatherDisruptionWithFDC((bytes32 merkleRoot, bytes32 leaf, bytes32[] proof, (bytes32 requestHash, (bytes abiEncodedData) responseBody) data)) external',
  'function updateWeatherSimple(uint256 rainfall, int256 latitude, int256 longitude) external',
  'function getCurrentWeatherEvent() external view returns (uint8 eventType, int256 priceImpact, uint256 timestamp, bool active)',
  'function getTheoreticalPrice() external view returns (uint256)',
  'function basePrice() external view returns (uint256)',
  'function owner() external view returns (address)'
];

interface FDCProof {
  merkleRoot: string;
  leaf: string;
  proof: string[];
  data: {
    requestHash: string;
    responseBody: {
      abiEncodedData: string;
    };
  };
}

async function submitFDCProof(proofPath: string) {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  if (!WEATHER_ORACLE_ADDRESS) throw new Error('WEATHER_ORACLE_ADDRESS not set');

  console.log('🔗 Connecting to Coston2...');
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`   Signer: ${signer.address}`);

  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS, ORACLE_ABI, signer);
  console.log(`   Oracle: ${WEATHER_ORACLE_ADDRESS}\n`);

  // Load proof
  console.log(`📄 Loading proof from: ${proofPath}`);
  const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf-8')) as FDCProof;

  // Decode weather data from proof
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const decoded = abiCoder.decode(
    ['tuple(uint256 rainfall, int256 temperature, int256 soilMoisture, int256 latitude, int256 longitude, uint256 timestamp)'],
    proofData.data.responseBody.abiEncodedData
  );
  const weatherData = decoded[0];

  console.log('\n🌤️  Weather Data from Proof:');
  console.log(`   Rainfall:     ${weatherData.rainfall}mm`);
  console.log(`   Temperature:  ${Number(weatherData.temperature) / 100}°C`);
  console.log(`   Humidity:     ${Number(weatherData.soilMoisture) / 100}%`);
  console.log(`   Location:     ${Number(weatherData.latitude) / 1e6}, ${Number(weatherData.longitude) / 1e6}`);
  console.log(`   Timestamp:    ${new Date(Number(weatherData.timestamp) * 1000).toISOString()}\n`);

  // Submit proof
  console.log('📝 Submitting FDC proof...');
  const tx = await oracle.setWeatherDisruptionWithFDC(proofData);
  console.log(`   TX Hash: ${tx.hash}`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Check updated state
  const [eventType, priceImpact, timestamp, active] = await oracle.getCurrentWeatherEvent();
  const theoreticalPrice = await oracle.getTheoreticalPrice();
  const basePrice = await oracle.basePrice();

  const eventNames = ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'];

  console.log('🌾 Oracle Updated:');
  console.log(`   Event Type:       ${eventNames[eventType]}`);
  console.log(`   Price Impact:     ${priceImpact > 0 ? '+' : ''}${priceImpact}%`);
  console.log(`   Active:           ${active}`);
  console.log(`   Base Price:       ${ethers.formatUnits(basePrice, 18)} FBTC`);
  console.log(`   Theoretical:      ${ethers.formatUnits(theoreticalPrice, 18)} FBTC`);
}

async function updateManually(rainfall: number, lat: number, lon: number) {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  if (!WEATHER_ORACLE_ADDRESS) throw new Error('WEATHER_ORACLE_ADDRESS not set');

  console.log('🔗 Connecting to Coston2...');
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS, ORACLE_ABI, signer);

  console.log(`\n📝 Updating weather manually...`);
  console.log(`   Rainfall: ${rainfall}mm`);
  console.log(`   Location: ${lat / 1e6}, ${lon / 1e6}\n`);

  const tx = await oracle.updateWeatherSimple(rainfall, lat, lon);
  console.log(`   TX Hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Check state
  const [eventType, priceImpact, , active] = await oracle.getCurrentWeatherEvent();
  const eventNames = ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'];

  console.log('🌾 Oracle Updated:');
  console.log(`   Event: ${eventNames[eventType]}`);
  console.log(`   Impact: ${priceImpact > 0 ? '+' : ''}${priceImpact}%`);
  console.log(`   Active: ${active}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('        FDC PROOF SUBMISSION TO WEATHER ORACLE        ');
  console.log('═══════════════════════════════════════════════════════\n');

  const command = process.argv[2] || 'help';

  if (command === 'submit' && process.argv[3]) {
    await submitFDCProof(process.argv[3]);
  } else if (command === 'manual') {
    // Manual update for testing: rainfall, lat, lon
    const rainfall = parseInt(process.argv[3] || '0');
    const lat = parseInt(process.argv[4] || '-18512200'); // Minas Gerais
    const lon = parseInt(process.argv[5] || '-44555000');
    await updateManually(rainfall, lat, lon);
  } else {
    console.log('USAGE:');
    console.log('  npx ts-node scripts/fdc-integration/submit-proof.ts submit <proof.json>');
    console.log('  npx ts-node scripts/fdc-integration/submit-proof.ts manual <rainfall> [lat] [lon]');
    console.log();
    console.log('EXAMPLES:');
    console.log('  # Submit FDC proof');
    console.log('  npx ts-node scripts/fdc-integration/submit-proof.ts submit proof.json');
    console.log();
    console.log('  # Manual drought simulation (0mm rainfall)');
    console.log('  npx ts-node scripts/fdc-integration/submit-proof.ts manual 0');
    console.log();
    console.log('  # Manual normal conditions (15mm rainfall)');
    console.log('  npx ts-node scripts/fdc-integration/submit-proof.ts manual 15');
  }
}

main().catch(console.error);
