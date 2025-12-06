/**
 * Create FDC Attestation Request for Weather Data
 * Generates JSON for submission to Flare FDC verifier
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

// Attestation type and source ID (hex-encoded, zero-padded to 32 bytes)
const ATTESTATION_TYPE_WEB2JSON = '0x576562324a736f6e000000000000000000000000000000000000000000000000';
const SOURCE_ID_WEB2 = '0x5765623200000000000000000000000000000000000000000000000000000000';

const COFFEE_REGIONS = {
  minas_gerais: { lat: -18.5122, lon: -44.5550, name: 'Minas Gerais, Brazil' },
  antioquia: { lat: 5.5689, lon: -75.6794, name: 'Antioquia, Colombia' },
  central_highlands: { lat: 12.2646, lon: 108.0323, name: 'Central Highlands, Vietnam' },
  kona: { lat: 19.6400, lon: -155.9969, name: 'Kona, Hawaii' }
};

function createWeatherAttestationRequest(region: keyof typeof COFFEE_REGIONS) {
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error('OPENWEATHERMAP_API_KEY not set in .env');
  }

  const { lat, lon } = COFFEE_REGIONS[region];

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;

  // JQ transformation for WeatherData struct
  const postprocessJq = `{
    rainfall: ((.rain."1h" // 0) | floor),
    temperature: ((.main.temp * 100) | floor),
    soilMoisture: ((.main.humidity * 100) | floor),
    latitude: ((.coord.lat * 1000000) | floor),
    longitude: ((.coord.lon * 1000000) | floor),
    timestamp: .dt
  }`;

  // ABI encoding specification
  const abiSignature = `{
    "components": [
      {"internalType": "uint256", "name": "rainfall", "type": "uint256"},
      {"internalType": "int256", "name": "temperature", "type": "int256"},
      {"internalType": "int256", "name": "soilMoisture", "type": "int256"},
      {"internalType": "int256", "name": "latitude", "type": "int256"},
      {"internalType": "int256", "name": "longitude", "type": "int256"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "internalType": "struct WeatherOracle.WeatherData",
    "name": "",
    "type": "tuple"
  }`;

  return {
    attestationType: ATTESTATION_TYPE_WEB2JSON,
    sourceId: SOURCE_ID_WEB2,
    requestBody: {
      url: url,
      postprocessJq: postprocessJq.replace(/\s+/g, ' ').trim(),
      abiSignature: abiSignature
    }
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     FDC ATTESTATION REQUEST GENERATOR                ');
  console.log('═══════════════════════════════════════════════════════\n');

  const region = (process.argv[2] || 'minas_gerais') as keyof typeof COFFEE_REGIONS;
  
  if (!COFFEE_REGIONS[region]) {
    console.error(`❌ Invalid region: ${region}`);
    console.log('Available:', Object.keys(COFFEE_REGIONS).join(', '));
    process.exit(1);
  }

  console.log(`📍 Creating attestation request for: ${COFFEE_REGIONS[region].name}\n`);

  try {
    const request = createWeatherAttestationRequest(region);
    
    // Output to console
    console.log('📋 ATTESTATION REQUEST:\n');
    console.log(JSON.stringify(request, null, 2));
    console.log();

    // Save to file
    const filename = `fdc-attestation-${region}.json`;
    fs.writeFileSync(
      `scripts/fdc-integration/${filename}`,
      JSON.stringify(request, null, 2)
    );
    console.log(`✅ Saved to: scripts/fdc-integration/${filename}\n`);

    console.log('📝 NEXT STEPS:');
    console.log('   1. Submit this request to FDC verifier');
    console.log('   2. Wait for attestation proof');
    console.log('   3. Call WeatherOracle.setWeatherDisruptionWithFDC(proof)');
    console.log();
    console.log('🔗 FDC Verifier: https://fdc-verifiers-testnet.flare.network');
    console.log('📚 Docs: https://dev.flare.network/fdc/\n');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);
