import * as dotenv from 'dotenv';

dotenv.config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const VISUAL_CROSSING_KEY = process.env.VISUAL_CROSSING_API_KEY;

// Coffee growing regions
const LOCATIONS = {
  minas_gerais: { lat: -18.5122, lon: -44.5550, name: 'Minas Gerais, Brazil' },
  sao_paulo: { lat: -23.5505, lon: -46.6333, name: 'São Paulo, Brazil' },
  colombia: { lat: 4.7110, lon: -74.0721, name: 'Colombia' },
  vietnam: { lat: 12.2500, lon: 108.0000, name: 'Vietnam' },
  ethiopia: { lat: 9.1450, lon: 40.4897, name: 'Ethiopia' },
};

async function testOpenWeatherMap(lat: number, lon: number) {
  if (!OPENWEATHER_API_KEY) {
    console.log('⚠️  OpenWeatherMap API key not found');
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ OpenWeatherMap:');
    console.log('   Temperature:', data.main.temp, '°C');
    console.log('   Humidity:', data.main.humidity, '%');
    console.log('   Weather:', data.weather[0].description);
    if (data.rain) {
      console.log('   Rainfall (1h):', data.rain['1h'] || 0, 'mm');
    }
    return data;
  } catch (error: any) {
    console.error('❌ OpenWeatherMap error:', error.message);
  }
}

async function testWeatherAPI(lat: number, lon: number) {
  if (!WEATHER_API_KEY) {
    console.log('⚠️  WeatherAPI key not found');
    return;
  }

  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ WeatherAPI.com:');
    console.log('   Temperature:', data.current.temp_c, '°C');
    console.log('   Humidity:', data.current.humidity, '%');
    console.log('   Condition:', data.current.condition.text);
    console.log('   Precipitation:', data.current.precip_mm, 'mm');
    return data;
  } catch (error: any) {
    console.error('❌ WeatherAPI error:', error.message);
  }
}

async function testVisualCrossing(lat: number, lon: number) {
  if (!VISUAL_CROSSING_KEY) {
    console.log('⚠️  Visual Crossing API key not found');
    return;
  }

  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/today?key=${VISUAL_CROSSING_KEY}&unitGroup=metric&include=current`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Visual Crossing:');
    console.log('   Temperature:', data.currentConditions.temp, '°C');
    console.log('   Humidity:', data.currentConditions.humidity, '%');
    console.log('   Conditions:', data.currentConditions.conditions);
    console.log('   Precipitation:', data.currentConditions.precip || 0, 'mm');
    return data;
  } catch (error: any) {
    console.error('❌ Visual Crossing error:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const locationKey = args[0] || 'minas_gerais';

  const location = LOCATIONS[locationKey as keyof typeof LOCATIONS];
  if (!location) {
    console.error('❌ Invalid location. Available:', Object.keys(LOCATIONS).join(', '));
    process.exit(1);
  }

  console.log('🌦️  TESTING WEATHER APIs\n');
  console.log('📍 Location:', location.name);
  console.log('📊 Coordinates:', location.lat, ',', location.lon);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testOpenWeatherMap(location.lat, location.lon);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testWeatherAPI(location.lat, location.lon);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testVisualCrossing(location.lat, location.lon);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Weather API testing complete!');
  console.log('\n📝 Available locations:');
  Object.entries(LOCATIONS).forEach(([key, loc]) => {
    console.log(`   ${key}: ${loc.name}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
