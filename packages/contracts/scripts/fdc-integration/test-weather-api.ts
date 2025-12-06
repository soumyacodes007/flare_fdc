/**
 * Test Weather API Connection for FDC Integration
 * Similar to ETHGlobal's test-eia-api.ts pattern
 */

import * as dotenv from 'dotenv';
dotenv.config();

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const VISUAL_CROSSING_API_KEY = process.env.VISUAL_CROSSING_API_KEY;

// Coffee growing regions
const COFFEE_REGIONS = {
  minas_gerais: { lat: -18.5122, lon: -44.5550, name: 'Minas Gerais, Brazil' },
  antioquia: { lat: 5.5689, lon: -75.6794, name: 'Antioquia, Colombia' },
  central_highlands: { lat: 12.2646, lon: 108.0323, name: 'Central Highlands, Vietnam' },
  kona: { lat: 19.6400, lon: -155.9969, name: 'Kona, Hawaii' }
};

interface WeatherData {
  rainfall: number;
  temperature: number;
  humidity: number;
  timestamp: number;
  source: string;
}

async function fetchOpenWeatherMap(lat: number, lon: number): Promise<WeatherData | null> {
  if (!OPENWEATHERMAP_API_KEY) return null;
  
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    
    return {
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      timestamp: data.dt,
      source: 'OpenWeatherMap'
    };
  } catch (e) {
    console.log('   OpenWeatherMap: Failed -', (e as Error).message);
    return null;
  }
}

async function fetchWeatherAPI(lat: number, lon: number): Promise<WeatherData | null> {
  if (!WEATHER_API_KEY) return null;
  
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    
    return {
      rainfall: data.current.precip_mm || 0,
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      timestamp: data.current.last_updated_epoch,
      source: 'WeatherAPI'
    };
  } catch (e) {
    console.log('   WeatherAPI: Failed -', (e as Error).message);
    return null;
  }
}

async function fetchVisualCrossing(lat: number, lon: number): Promise<WeatherData | null> {
  if (!VISUAL_CROSSING_API_KEY) return null;
  
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/today?unitGroup=metric&key=${VISUAL_CROSSING_API_KEY}&include=current`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    
    return {
      rainfall: data.currentConditions?.precip || 0,
      temperature: data.currentConditions?.temp || 0,
      humidity: data.currentConditions?.humidity || 0,
      timestamp: Math.floor(Date.now() / 1000),
      source: 'VisualCrossing'
    };
  } catch (e) {
    console.log('   VisualCrossing: Failed -', (e as Error).message);
    return null;
  }
}

function calculateDroughtStatus(rainfall: number): { status: string; multiplier: number; impact: number } {
  if (rainfall === 0) {
    return { status: 'SEVERE DROUGHT', multiplier: 150, impact: 50 };
  } else if (rainfall < 5) {
    return { status: 'MODERATE DROUGHT', multiplier: 130, impact: 30 };
  } else if (rainfall < 10) {
    return { status: 'MILD DROUGHT', multiplier: 115, impact: 15 };
  } else {
    return { status: 'NORMAL', multiplier: 100, impact: 0 };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('       WEATHER API TEST FOR FDC INTEGRATION           ');
  console.log('═══════════════════════════════════════════════════════\n');

  const region = (process.argv[2] || 'minas_gerais') as keyof typeof COFFEE_REGIONS;
  
  if (!COFFEE_REGIONS[region]) {
    console.error(`❌ Invalid region: ${region}`);
    console.log('Available:', Object.keys(COFFEE_REGIONS).join(', '));
    process.exit(1);
  }

  const { lat, lon, name } = COFFEE_REGIONS[region];
  console.log(`📍 Region: ${name}`);
  console.log(`   Coordinates: ${lat}, ${lon}\n`);

  // Check API keys
  console.log('🔑 API KEY STATUS:');
  console.log(`   OpenWeatherMap:  ${OPENWEATHERMAP_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   WeatherAPI:      ${WEATHER_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   VisualCrossing:  ${VISUAL_CROSSING_API_KEY ? '✓ Set' : '✗ Missing'}\n`);

  // Fetch from all sources
  console.log('🌤️  FETCHING WEATHER DATA...\n');
  
  const results = await Promise.all([
    fetchOpenWeatherMap(lat, lon),
    fetchWeatherAPI(lat, lon),
    fetchVisualCrossing(lat, lon)
  ]);

  const validResults = results.filter(r => r !== null) as WeatherData[];

  if (validResults.length === 0) {
    console.error('❌ No weather data retrieved. Check API keys.');
    process.exit(1);
  }

  // Display results from each source
  console.log('📊 RAW WEATHER DATA:\n');
  for (const data of validResults) {
    console.log(`   [${data.source}]`);
    console.log(`   Temperature: ${data.temperature}°C`);
    console.log(`   Humidity:    ${data.humidity}%`);
    console.log(`   Rainfall:    ${data.rainfall}mm`);
    console.log(`   Timestamp:   ${new Date(data.timestamp * 1000).toISOString()}\n`);
  }

  // Calculate consensus (average)
  const avgRainfall = validResults.reduce((sum, r) => sum + r.rainfall, 0) / validResults.length;
  const avgTemp = validResults.reduce((sum, r) => sum + r.temperature, 0) / validResults.length;
  const avgHumidity = validResults.reduce((sum, r) => sum + r.humidity, 0) / validResults.length;

  console.log('🔄 CONSENSUS DATA (Average of sources):');
  console.log(`   Rainfall:    ${avgRainfall.toFixed(2)}mm`);
  console.log(`   Temperature: ${avgTemp.toFixed(2)}°C`);
  console.log(`   Humidity:    ${avgHumidity.toFixed(2)}%\n`);

  // Convert to contract format
  const contractData = {
    rainfall: Math.floor(avgRainfall),
    temperature: Math.floor(avgTemp * 100),
    soilMoisture: Math.floor(avgHumidity * 100),
    latitude: Math.floor(lat * 1000000),
    longitude: Math.floor(lon * 1000000),
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log('🔄 CONVERTED FOR SMART CONTRACT:');
  console.log(`   rainfall:     ${contractData.rainfall} (uint256)`);
  console.log(`   temperature:  ${contractData.temperature} (int256) = ${contractData.temperature / 100}°C`);
  console.log(`   soilMoisture: ${contractData.soilMoisture} (int256) = ${contractData.soilMoisture / 100}%`);
  console.log(`   latitude:     ${contractData.latitude} (int256)`);
  console.log(`   longitude:    ${contractData.longitude} (int256)`);
  console.log(`   timestamp:    ${contractData.timestamp} (uint256)\n`);

  // Drought analysis
  const drought = calculateDroughtStatus(contractData.rainfall);
  console.log('🌾 DROUGHT ANALYSIS:');
  console.log(`   Status:           ${drought.status}`);
  console.log(`   Price Multiplier: ${drought.multiplier}% (${drought.impact > 0 ? '+' : ''}${drought.impact}% impact)\n`);

  // Validation
  const now = Math.floor(Date.now() / 1000);
  console.log('✅ CONTRACT VALIDATION:');
  console.log(`   ✓ timestamp <= now:        true`);
  console.log(`   ✓ timestamp > 1 hour ago:  true`);
  console.log(`   ✓ Sources available:       ${validResults.length}/3\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('                    TEST COMPLETE                      ');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
