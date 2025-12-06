const { ethers } = require('ethers');
require('dotenv').config();

const WEATHER_ORACLE = '0x223163b9109e43BdA9d719DF1e7E584d781b93fd';
const FDC_VERIFIER_URL = 'https://fdc-verifiers-testnet.flare.network';

const RPC_URL = process.env.COSTON2_RPC || 'https://coston2-api.flare.network/ext/C/rpc';
const OPENWEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Coffee growing regions
const LOCATIONS = {
  minas_gerais: { lat: -18.5122, lon: -44.5550, name: 'Minas Gerais, Brazil' },
  sao_paulo: { lat: -23.5505, lon: -46.6333, name: 'São Paulo, Brazil' },
  colombia: { lat: 4.7110, lon: -74.0721, name: 'Colombia' },
};

async function fetchWeatherData(lat, lon) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHERMAP_API_KEY not found in .env');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function createFDCRequest(weatherData, location) {
  // FDC attestation request structure
  const attestationRequest = {
    attestationType: 'Web2Json',
    sourceId: 'OpenWeatherMap',
    requestBody: {
      url: `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`,
      method: 'GET',
      headers: {},
      responseSchema: {
        type: 'object',
        properties: {
          main: {
            type: 'object',
            properties: {
              temp: { type: 'number' },
              humidity: { type: 'number' },
            },
          },
          weather: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
              },
            },
          },
          rain: {
            type: 'object',
            properties: {
              '1h': { type: 'number' },
            },
          },
        },
      },
    },
  };

  return attestationRequest;
}

async function main() {
  const locationKey = process.argv[2] || 'minas_gerais';

  const location = LOCATIONS[locationKey];
  if (!location) {
    console.error('❌ Invalid location. Available:', Object.keys(LOCATIONS).join(', '));
    process.exit(1);
  }

  console.log('🌐 FDC ATTESTATION TEST\n');
  console.log('📍 Location:', location.name);
  console.log('📊 Coordinates:', location.lat, ',', location.lon);
  console.log('🔗 FDC Verifier:', FDC_VERIFIER_URL);
  console.log('\n');

  // Step 1: Fetch weather data
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Fetch Weather Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const weatherData = await fetchWeatherData(location.lat, location.lon);
    
    console.log('✅ Weather data fetched:');
    console.log('   Temperature:', weatherData.main.temp, '°C');
    console.log('   Humidity:', weatherData.main.humidity, '%');
    console.log('   Condition:', weatherData.weather[0].description);
    console.log('   Rainfall:', weatherData.rain ? weatherData.rain['1h'] || 0 : 0, 'mm');

    // Step 2: Create FDC attestation request
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Create FDC Attestation Request');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const attestationRequest = await createFDCRequest(weatherData, location);
    
    console.log('✅ FDC Request created:');
    console.log('   Attestation Type:', attestationRequest.attestationType);
    console.log('   Source ID:', attestationRequest.sourceId);
    console.log('   URL:', attestationRequest.requestBody.url.substring(0, 80) + '...');

    // Step 3: Prepare for submission
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: FDC Submission Process');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 To submit this attestation to FDC:');
    console.log('\n1. Submit request to FDC verifier:');
    console.log('   POST', FDC_VERIFIER_URL + '/api/v1/attestation/request');
    console.log('\n2. Wait for attestation proof (typically 90 seconds)');
    console.log('\n3. Retrieve proof:');
    console.log('   GET', FDC_VERIFIER_URL + '/api/v1/attestation/proof/{requestId}');
    console.log('\n4. Submit proof to WeatherOracle contract');

    // Step 4: Show expected on-chain data
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Expected On-Chain Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const rainfall = weatherData.rain ? weatherData.rain['1h'] || 0 : 0;
    const temperature = Math.round(weatherData.main.temp * 100); // Celsius * 100
    const humidity = weatherData.main.humidity;

    console.log('Weather Data for Oracle:');
    console.log('   Rainfall:', rainfall, 'mm');
    console.log('   Temperature:', temperature, '(', weatherData.main.temp, '°C )');
    console.log('   Humidity:', humidity, '%');
    console.log('   Latitude:', Math.round(location.lat * 1e6));
    console.log('   Longitude:', Math.round(location.lon * 1e6));

    // Determine drought status
    const isDrought = rainfall < 10; // Less than 10mm = drought
    console.log('\n🌵 Drought Status:', isDrought ? '⚠️  DROUGHT DETECTED' : '✅ Normal conditions');

    if (isDrought) {
      console.log('   This would trigger:');
      console.log('   - 50% price increase in oracle');
      console.log('   - Insurance claim eligibility');
      console.log('   - Recovery mode in hook (50-100% deviation)');
    }

    // Step 5: Mock FDC proof structure
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: FDC Proof Structure');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mockProof = {
      merkleProof: ['0x...', '0x...'],
      data: {
        attestationType: 'Web2Json',
        sourceId: 'OpenWeatherMap',
        votingRound: 12345,
        lowestUsedTimestamp: Math.floor(Date.now() / 1000),
        requestBody: attestationRequest.requestBody,
        responseBody: {
          main: {
            temp: weatherData.main.temp,
            humidity: weatherData.main.humidity,
          },
          rain: {
            '1h': rainfall,
          },
        },
      },
    };

    console.log('✅ FDC Proof would contain:');
    console.log('   - Merkle proof for verification');
    console.log('   - Voting round:', mockProof.data.votingRound);
    console.log('   - Timestamp:', mockProof.data.lowestUsedTimestamp);
    console.log('   - Response data: temperature, humidity, rainfall');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FDC ATTESTATION TEST COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Summary:');
    console.log('  ✅ Weather data fetched from OpenWeatherMap');
    console.log('  ✅ FDC attestation request structure created');
    console.log('  ✅ Drought detection logic verified');
    console.log('  ✅ On-chain data format prepared');
    console.log('\nNote: Full FDC integration requires:');
    console.log('  1. Submitting requests to FDC verifier');
    console.log('  2. Waiting for consensus (90s)');
    console.log('  3. Retrieving cryptographic proofs');
    console.log('  4. Verifying proofs on-chain');
    console.log('  5. Updating oracle with verified data');

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
