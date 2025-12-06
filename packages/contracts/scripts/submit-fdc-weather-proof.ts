/**
 * Submit FDC Weather Proof to WeatherOracle Contract
 * 
 * This script creates an FDC attestation request for weather data,
 * retrieves the proof from the FDC verifier, and submits it to the
 * WeatherOracle contract to update weather conditions and price adjustments.
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const FDC_VERIFIER_URL = 'https://fdc-verifiers-testnet.flare.network';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_ORACLE_ADDRESS = process.env.WEATHER_ORACLE_ADDRESS;
const COSTON2_RPC = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Coffee growing regions
const COFFEE_REGIONS = {
  minas_gerais: { lat: -18.5122, lon: -44.5550, name: 'Minas Gerais, Brazil' },
  antioquia: { lat: 5.5689, lon: -75.6794, name: 'Antioquia, Colombia' },
  central_highlands: { lat: 12.2646, lon: 108.0323, name: 'Central Highlands, Vietnam' },
  kona: { lat: 19.6400, lon: -155.9969, name: 'Kona, Hawaii' }
};

// Attestation type and source ID (hex-encoded, zero-padded to 32 bytes)
const ATTESTATION_TYPE_JSONAPI = '0x4a736f6e417069000000000000000000000000000000000000000000000000';
const SOURCE_ID_OPENWEATHER = '0x4f70656e576561746865724d6170000000000000000000000000000000000000';

interface AttestationRequest {
  attestationType: string;
  sourceId: string;
  requestBody: {
    url: string;
    jqTransform: string;
    abi: any;
  };
}

interface FDCProof {
  data: {
    attestationType: string;
    sourceId: string;
    votingRound: number;
    lowestUsedTimestamp: number;
    requestBody: {
      url: string;
      postprocessJQ: string;
    };
    responseBody: {
      abiEncodedData: string;
    };
  };
  merkleProof: string[];
}

/**
 * Create FDC attestation request for weather data
 */
function createWeatherAttestationRequest(region: keyof typeof COFFEE_REGIONS): AttestationRequest {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY environment variable not set');
  }

  const { lat, lon } = COFFEE_REGIONS[region];

  // OpenWeatherMap API URL
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  // JQ transformation to convert OpenWeatherMap response to WeatherData format
  const jqTransform = '{rainfall: ((.rain."1h" // 0) * 1), temperature: ((.main.temp * 100) | floor), soilMoisture: ((.main.humidity * 100) | floor), latitude: ((.coord.lat * 1000000) | floor), longitude: ((.coord.lon * 1000000) | floor), timestamp: .dt}';

  // ABI for WeatherData struct
  const abi = {
    components: [
      { internalType: 'uint256', name: 'rainfall', type: 'uint256' },
      { internalType: 'int256', name: 'temperature', type: 'int256' },
      { internalType: 'int256', name: 'soilMoisture', type: 'int256' },
      { internalType: 'int256', name: 'latitude', type: 'int256' },
      { internalType: 'int256', name: 'longitude', type: 'int256' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    internalType: 'struct WeatherOracle.WeatherData',
    name: '',
    type: 'tuple'
  };

  return {
    attestationType: ATTESTATION_TYPE_JSONAPI,
    sourceId: SOURCE_ID_OPENWEATHER,
    requestBody: {
      url: weatherUrl,
      jqTransform,
      abi
    }
  };
}

/**
 * Test OpenWeatherMap API connection
 */
async function testWeatherAPI(region: keyof typeof COFFEE_REGIONS): Promise<void> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not set');
  }

  const { lat, lon, name } = COFFEE_REGIONS[region];
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  console.log(`🌤️  Testing OpenWeatherMap API for ${name}...`);
  console.log(`   URL: ${url.replace(OPENWEATHER_API_KEY, 'YOUR_KEY')}`);
  console.log();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  console.log('📊 RAW WEATHER DATA:');
  console.log(`   Location:    ${data.name}, ${data.sys.country}`);
  console.log(`   Temperature: ${data.main.temp}°C`);
  console.log(`   Humidity:    ${data.main.humidity}%`);
  console.log(`   Rainfall:    ${data.rain?.['1h'] || 0}mm (last hour)`);
  console.log(`   Coordinates: ${data.coord.lat}, ${data.coord.lon}`);
  console.log(`   Timestamp:   ${new Date(data.dt * 1000).toISOString()}`);
  console.log();

  // Convert to contract format
  const weatherData = {
    rainfall: Math.floor((data.rain?.['1h'] || 0) * 1),
    temperature: Math.floor(data.main.temp * 100),
    soilMoisture: Math.floor(data.main.humidity * 100),
    latitude: Math.floor(data.coord.lat * 1000000),
    longitude: Math.floor(data.coord.lon * 1000000),
    timestamp: data.dt
  };

  console.log('🔄 CONVERTED FOR SMART CONTRACT:');
  console.log(`   rainfall:     ${weatherData.rainfall} (uint256)`);
  console.log(`   temperature:  ${weatherData.temperature} (int256) = ${weatherData.temperature / 100}°C`);
  console.log(`   soilMoisture: ${weatherData.soilMoisture} (int256) = ${weatherData.soilMoisture / 100}%`);
  console.log(`   latitude:     ${weatherData.latitude} (int256)`);
  console.log(`   longitude:    ${weatherData.longitude} (int256)`);
  console.log(`   timestamp:    ${weatherData.timestamp} (uint256)`);
  console.log();

  // Determine drought status
  let droughtStatus = 'NORMAL';
  let multiplier = 100;
  if (weatherData.rainfall === 0) {
    droughtStatus = 'SEVERE DROUGHT';
    multiplier = 150;
  } else if (weatherData.rainfall < 5) {
    droughtStatus = 'MODERATE DROUGHT';
    multiplier = 130;
  } else if (weatherData.rainfall < 10) {
    droughtStatus = 'MILD DROUGHT';
    multiplier = 115;
  }

  console.log('🌾 DROUGHT ANALYSIS:');
  console.log(`   Status:           ${droughtStatus}`);
  console.log(`   Price Multiplier: ${multiplier}% (${multiplier - 100 > 0 ? '+' : ''}${multiplier - 100}% impact)`);
  console.log();

  // Validation
  const now = Math.floor(Date.now() / 1000);
  const isValid = weatherData.timestamp <= now && weatherData.timestamp > now - 3600;

  console.log('✅ CONTRACT VALIDATION:');
  console.log(`   ✓ timestamp <= now:        ${weatherData.timestamp <= now}`);
  console.log(`   ✓ timestamp > 1 hour ago:  ${weatherData.timestamp > now - 3600}`);
  console.log(`   ✓ Overall valid:           ${isValid}`);
  console.log();
}

/**
 * Submit attestation request to FDC verifier (PLACEHOLDER)
 */
async function submitAttestationRequest(request: AttestationRequest): Promise<FDCProof> {
  console.log('📤 Submitting attestation request to FDC verifier...');
  console.log(`   Verifier: ${FDC_VERIFIER_URL}`);
  console.log(`   Attestation Type: JsonApi`);
  console.log(`   Source: OpenWeatherMap`);
  console.log();

  // NOTE: This is a placeholder implementation
  // The actual FDC API endpoints and authentication may differ
  // Refer to Flare documentation for the exact implementation

  throw new Error('FDC submission not yet implemented. See documentation for manual submission process.');
}

/**
 * Update WeatherOracle with FDC proof
 */
async function updateOracleWeather(proof: FDCProof): Promise<void> {
  if (!WEATHER_ORACLE_ADDRESS) {
    throw new Error('WEATHER_ORACLE_ADDRESS environment variable not set');
  }
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  console.log('🔗 Connecting to WeatherOracle contract...');
  console.log(`   Address: ${WEATHER_ORACLE_ADDRESS}`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(COSTON2_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`   Signer: ${signer.address}`);
  console.log();

  // WeatherOracle ABI (minimal)
  const abi = [
    'function setWeatherDisruptionWithFDC((bytes32,bytes32,uint256,uint256,(string,string),(bytes)) proof) external',
    'function getCurrentWeatherEvent() external view returns (uint8,int256,uint256,bool)',
    'function getTheoreticalPrice() external view returns (uint256)',
    'function basePrice() external view returns (uint256)'
  ];

  const oracle = new ethers.Contract(WEATHER_ORACLE_ADDRESS, abi, signer);

  // Decode the weather data from the proof to display it
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const decodedData = abiCoder.decode(
    ['tuple(uint256 rainfall, int256 temperature, int256 soilMoisture, int256 latitude, int256 longitude, uint256 timestamp)'],
    proof.data.responseBody.abiEncodedData
  );
  const weatherData = decodedData[0];

  console.log('🌤️  Weather Data from FDC Proof:');
  console.log(`   Rainfall:     ${weatherData.rainfall}mm`);
  console.log(`   Temperature:  ${Number(weatherData.temperature) / 100}°C`);
  console.log(`   Soil Moisture: ${Number(weatherData.soilMoisture) / 100}%`);
  console.log(`   GPS:          ${Number(weatherData.latitude) / 1000000}, ${Number(weatherData.longitude) / 1000000}`);
  console.log(`   Timestamp:    ${new Date(Number(weatherData.timestamp) * 1000).toISOString()}`);
  console.log();

  // Call setWeatherDisruptionWithFDC
  console.log('📝 Submitting transaction to update weather conditions...');

  const tx = await oracle.setWeatherDisruptionWithFDC(proof);
  console.log(`   Transaction hash: ${tx.hash}`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
  console.log();

  // Get updated weather event
  const [eventType, priceImpact, timestamp, active] = await oracle.getCurrentWeatherEvent();
  const theoreticalPrice = await oracle.getTheoreticalPrice();
  const basePrice = await oracle.basePrice();

  const eventNames = ['NONE', 'DROUGHT', 'FROST', 'FLOOD', 'HEATWAVE', 'STORM'];

  console.log('🌾 Oracle Updated:');
  console.log(`   Weather Event:    ${eventNames[eventType]}`);
  console.log(`   Price Impact:     ${priceImpact > 0 ? '+' : ''}${priceImpact}%`);
  console.log(`   Active:           ${active}`);
  console.log(`   Base Price:       ${ethers.formatUnits(basePrice, 18)} FBTC`);
  console.log(`   Theoretical Price: ${ethers.formatUnits(theoreticalPrice, 18)} FBTC`);
  console.log(`   Multiplier:       ${Number(theoreticalPrice) / Number(basePrice)}x`);
  console.log();
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('    FDC WEATHER PROOF SUBMISSION TO WEATHER ORACLE    ');
  console.log('═══════════════════════════════════════════════════════');
  console.log();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  const region = (args[1] || 'minas_gerais') as keyof typeof COFFEE_REGIONS;

  if (!COFFEE_REGIONS[region]) {
    console.error(`❌ Invalid region: ${region}`);
    console.log('Available regions:', Object.keys(COFFEE_REGIONS).join(', '));
    process.exit(1);
  }

  try {
    if (command === 'test') {
      // Test API connection
      console.log('MODE: Test OpenWeatherMap API Connection');
      console.log();
      await testWeatherAPI(region);

    } else if (command === 'create-request') {
      // Create attestation request
      console.log('MODE: Create FDC Attestation Request');
      console.log();
      const request = createWeatherAttestationRequest(region);
      console.log('📋 Attestation Request JSON:');
      console.log(JSON.stringify(request, null, 2));
      console.log();
      console.log('💡 NEXT STEPS:');
      console.log('   1. Save this JSON to a file');
      console.log('   2. Submit to FDC verifier using Flare attestation client');
      console.log('   3. Wait for proof generation');
      console.log('   4. Run: npm run submit-weather-proof submit <proof.json>');
      console.log();

    } else if (command === 'submit') {
      // Submit proof to contract
      console.log('MODE: Submit FDC Proof to Contract');
      console.log();
      
      if (!args[1]) {
        throw new Error('Proof file path required. Usage: npm run submit-weather-proof submit <proof.json>');
      }

      console.log('⚠️  NOTE: FDC proof submission requires:');
      console.log('   1. Valid FDC proof JSON file');
      console.log('   2. WEATHER_ORACLE_ADDRESS in .env');
      console.log('   3. PRIVATE_KEY in .env');
      console.log();
      console.log('This feature is not yet fully implemented.');
      console.log('Please refer to the FDC documentation for manual submission.');
      console.log();

    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.log();
      console.log('USAGE:');
      console.log('  npm run submit-weather-proof test [region]           - Test API connection');
      console.log('  npm run submit-weather-proof create-request [region] - Create attestation request');
      console.log('  npm run submit-weather-proof submit <proof.json>     - Submit proof to contract');
      console.log();
      console.log('REGIONS:', Object.keys(COFFEE_REGIONS).join(', '));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
