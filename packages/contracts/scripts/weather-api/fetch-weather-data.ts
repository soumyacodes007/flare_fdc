/**
 * Weather API Data Fetcher
 * Fetches weather data from 3 sources for multi-source consensus
 */

import axios from 'axios';

// API Keys
const API_KEYS = {
  visualCrossing: 'RWPN3F68K42ESNZ65XP9TFA6R',
  weatherApi: 'b215dd0a8bf64c79b8063516250512',
  openWeatherMap: '615438bd3a7fe978b5682e1813112658'
};

// Test location: Minas Gerais, Brazil (Coffee region)
const TEST_LOCATION = {
  latitude: -18.5122,
  longitude: -44.5550,
  name: 'Minas Gerais, Brazil'
};

interface WeatherData {
  source: string;
  rainfall: number;        // mm in last 7 days
  temperature: number;     // Celsius
  humidity: number;        // Percentage
  timestamp: number;       // Unix timestamp
  raw?: any;              // Raw API response
}

/**
 * Fetch weather data from Visual Crossing
 */
async function fetchVisualCrossing(lat: number, lon: number): Promise<WeatherData> {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${startDate}/${endDate}`;
  
  try {
    const response = await axios.get(url, {
      params: {
        key: API_KEYS.visualCrossing,
        unitGroup: 'metric',
        include: 'days',
        elements: 'datetime,temp,precip,humidity'
      }
    });

    const data = response.data;
    
    // Sum rainfall over 7 days
    const totalRainfall = data.days.reduce((sum: number, day: any) => {
      return sum + (day.precip || 0);
    }, 0);

    // Average temperature
    const avgTemp = data.days.reduce((sum: number, day: any) => {
      return sum + day.temp;
    }, 0) / data.days.length;

    // Average humidity
    const avgHumidity = data.days.reduce((sum: number, day: any) => {
      return sum + day.humidity;
    }, 0) / data.days.length;

    return {
      source: 'VisualCrossing',
      rainfall: Math.round(totalRainfall * 10) / 10,
      temperature: Math.round(avgTemp * 10) / 10,
      humidity: Math.round(avgHumidity * 10) / 10,
      timestamp: Math.floor(Date.now() / 1000),
      raw: data
    };
  } catch (error: any) {
    console.error('VisualCrossing Error:', error.message);
    throw error;
  }
}

/**
 * Fetch weather data from WeatherAPI.com
 */
async function fetchWeatherAPI(lat: number, lon: number): Promise<WeatherData> {
  const url = 'http://api.weatherapi.com/v1/history.json';
  
  try {
    // WeatherAPI only allows 7 days history on free plan
    const promises = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      promises.push(
        axios.get(url, {
          params: {
            key: API_KEYS.weatherApi,
            q: `${lat},${lon}`,
            dt: dateStr
          }
        })
      );
    }

    const responses = await Promise.all(promises);
    
    let totalRainfall = 0;
    let totalTemp = 0;
    let totalHumidity = 0;
    let count = 0;

    responses.forEach(response => {
      const day = response.data.forecast.forecastday[0].day;
      totalRainfall += day.totalprecip_mm || 0;
      totalTemp += day.avgtemp_c;
      totalHumidity += day.avghumidity;
      count++;
    });

    return {
      source: 'WeatherAPI',
      rainfall: Math.round(totalRainfall * 10) / 10,
      temperature: Math.round((totalTemp / count) * 10) / 10,
      humidity: Math.round((totalHumidity / count) * 10) / 10,
      timestamp: Math.floor(Date.now() / 1000),
      raw: responses[0].data
    };
  } catch (error: any) {
    console.error('WeatherAPI Error:', error.message);
    throw error;
  }
}

/**
 * Fetch weather data from OpenWeatherMap
 * Note: Historical data requires paid plan, using current + forecast as approximation
 */
async function fetchOpenWeatherMap(lat: number, lon: number): Promise<WeatherData> {
  const url = 'https://api.openweathermap.org/data/2.5/weather';
  
  try {
    const response = await axios.get(url, {
      params: {
        lat: lat,
        lon: lon,
        appid: API_KEYS.openWeatherMap,
        units: 'metric'
      }
    });

    const data = response.data;
    
    // OpenWeatherMap free tier doesn't have 7-day historical rainfall
    // Using current conditions as approximation
    const rainfall = (data.rain?.['1h'] || 0) * 24 * 7; // Extrapolate hourly to 7 days (rough estimate)
    
    return {
      source: 'OpenWeatherMap',
      rainfall: Math.round(rainfall * 10) / 10,
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: Math.round(data.main.humidity * 10) / 10,
      timestamp: Math.floor(Date.now() / 1000),
      raw: data
    };
  } catch (error: any) {
    console.error('OpenWeatherMap Error:', error.message);
    throw error;
  }
}

/**
 * Calculate consensus from multiple sources (2/3 agreement)
 */
function calculateConsensus(data: WeatherData[]): {
  rainfall: number;
  temperature: number;
  humidity: number;
  consensus: boolean;
  sources: string[];
} {
  if (data.length < 2) {
    throw new Error('Need at least 2 sources for consensus');
  }

  // Sort rainfall values
  const rainfallValues = data.map(d => d.rainfall).sort((a, b) => a - b);
  const tempValues = data.map(d => d.temperature).sort((a, b) => a - b);
  const humidityValues = data.map(d => d.humidity).sort((a, b) => a - b);

  // Use median for consensus
  const medianRainfall = rainfallValues[Math.floor(rainfallValues.length / 2)];
  const medianTemp = tempValues[Math.floor(tempValues.length / 2)];
  const medianHumidity = humidityValues[Math.floor(humidityValues.length / 2)];

  // Check if values are within 20% of each other (consensus threshold)
  const rainfallConsensus = rainfallValues.every(v => 
    Math.abs(v - medianRainfall) / (medianRainfall + 0.1) <= 0.2
  );

  return {
    rainfall: Math.round(medianRainfall * 10) / 10,
    temperature: Math.round(medianTemp * 10) / 10,
    humidity: Math.round(medianHumidity * 10) / 10,
    consensus: rainfallConsensus,
    sources: data.map(d => d.source)
  };
}

/**
 * Determine drought severity based on rainfall
 */
function getDroughtSeverity(rainfall: number): {
  severity: string;
  multiplier: number;
  description: string;
} {
  if (rainfall === 0) {
    return {
      severity: 'SEVERE',
      multiplier: 150,
      description: 'Severe drought - Coffee plants dying'
    };
  } else if (rainfall < 5) {
    return {
      severity: 'MODERATE',
      multiplier: 130,
      description: 'Moderate drought - Coffee plants stressed'
    };
  } else if (rainfall < 10) {
    return {
      severity: 'MILD',
      multiplier: 115,
      description: 'Mild drought - Coffee plants struggling'
    };
  } else {
    return {
      severity: 'NORMAL',
      multiplier: 100,
      description: 'Normal conditions - Coffee plants healthy'
    };
  }
}

/**
 * Main function to fetch and process weather data
 */
async function main() {
  console.log('🌦️  Fetching Weather Data for Agri-Hook\n');
  console.log(`📍 Location: ${TEST_LOCATION.name}`);
  console.log(`   Coordinates: ${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude}\n`);

  const weatherData: WeatherData[] = [];

  // Fetch from all sources
  console.log('Fetching from VisualCrossing...');
  try {
    const vc = await fetchVisualCrossing(TEST_LOCATION.latitude, TEST_LOCATION.longitude);
    weatherData.push(vc);
    console.log(`✅ VisualCrossing: ${vc.rainfall}mm rainfall, ${vc.temperature}°C, ${vc.humidity}% humidity`);
  } catch (error) {
    console.log('❌ VisualCrossing failed');
  }

  console.log('\nFetching from WeatherAPI...');
  try {
    const wa = await fetchWeatherAPI(TEST_LOCATION.latitude, TEST_LOCATION.longitude);
    weatherData.push(wa);
    console.log(`✅ WeatherAPI: ${wa.rainfall}mm rainfall, ${wa.temperature}°C, ${wa.humidity}% humidity`);
  } catch (error) {
    console.log('❌ WeatherAPI failed');
  }

  console.log('\nFetching from OpenWeatherMap...');
  try {
    const owm = await fetchOpenWeatherMap(TEST_LOCATION.latitude, TEST_LOCATION.longitude);
    weatherData.push(owm);
    console.log(`✅ OpenWeatherMap: ${owm.rainfall}mm rainfall, ${owm.temperature}°C, ${owm.humidity}% humidity`);
  } catch (error) {
    console.log('❌ OpenWeatherMap failed');
  }

  // Calculate consensus
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONSENSUS CALCULATION\n');

  if (weatherData.length < 2) {
    console.log('❌ Not enough data sources (need at least 2)');
    return;
  }

  const consensus = calculateConsensus(weatherData);
  console.log(`Sources: ${consensus.sources.join(', ')}`);
  console.log(`Consensus: ${consensus.consensus ? '✅ ACHIEVED' : '⚠️  NO CONSENSUS'}`);
  console.log(`\nMedian Values:`);
  console.log(`  Rainfall (7 days): ${consensus.rainfall}mm`);
  console.log(`  Temperature: ${consensus.temperature}°C`);
  console.log(`  Humidity: ${consensus.humidity}%`);

  // Determine drought severity
  const drought = getDroughtSeverity(consensus.rainfall);
  console.log('\n' + '='.repeat(60));
  console.log('🌾 DROUGHT ANALYSIS\n');
  console.log(`Severity: ${drought.severity}`);
  console.log(`Price Multiplier: ${drought.multiplier}%`);
  console.log(`Description: ${drought.description}`);

  // Calculate adjusted price
  const basePrice = 5.0; // $5 per bag
  const adjustedPrice = (basePrice * drought.multiplier) / 100;
  console.log(`\nBase Coffee Price: $${basePrice.toFixed(2)}`);
  console.log(`Adjusted Price: $${adjustedPrice.toFixed(2)}`);
  console.log(`Impact: ${drought.multiplier - 100 > 0 ? '+' : ''}${drought.multiplier - 100}%`);

  // Generate smart contract data
  console.log('\n' + '='.repeat(60));
  console.log('📝 SMART CONTRACT DATA\n');
  console.log('WeatherData struct:');
  console.log(`{`);
  console.log(`  rainfall: ${Math.floor(consensus.rainfall * 100)}, // ${consensus.rainfall}mm × 100`);
  console.log(`  temperature: ${Math.floor(consensus.temperature * 100)}, // ${consensus.temperature}°C × 100`);
  console.log(`  soilMoisture: 0, // Not available from APIs`);
  console.log(`  latitude: ${Math.floor(TEST_LOCATION.latitude * 1e6)}, // ${TEST_LOCATION.latitude} × 1e6`);
  console.log(`  longitude: ${Math.floor(TEST_LOCATION.longitude * 1e6)}, // ${TEST_LOCATION.longitude} × 1e6`);
  console.log(`  timestamp: ${Math.floor(Date.now() / 1000)}`);
  console.log(`}`);

  console.log('\n✅ Weather data fetch complete!\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  fetchVisualCrossing,
  fetchWeatherAPI,
  fetchOpenWeatherMap,
  calculateConsensus,
  getDroughtSeverity,
  WeatherData
};
