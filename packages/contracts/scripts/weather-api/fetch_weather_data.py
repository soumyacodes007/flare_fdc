#!/usr/bin/env python3
"""
Weather API Data Fetcher for Agri-Hook
Fetches weather data from 3 sources for multi-source consensus
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import statistics

# API Keys
API_KEYS = {
    'visual_crossing': 'RWPN3F68K42ESNZ65XP9TFA6R',
    'weather_api': 'b215dd0a8bf64c79b8063516250512',
    'openweathermap': '615438bd3a7fe978b5682e1813112658'
}

# Test location: Minas Gerais, Brazil (Coffee region)
TEST_LOCATION = {
    'latitude': -18.5122,
    'longitude': -44.5550,
    'name': 'Minas Gerais, Brazil'
}

def fetch_visual_crossing(lat: float, lon: float) -> Dict:
    """Fetch weather data from Visual Crossing"""
    today = datetime.now()
    seven_days_ago = today - timedelta(days=7)
    
    start_date = seven_days_ago.strftime('%Y-%m-%d')
    end_date = today.strftime('%Y-%m-%d')
    
    url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{lat},{lon}/{start_date}/{end_date}"
    
    params = {
        'key': API_KEYS['visual_crossing'],
        'unitGroup': 'metric',
        'include': 'days',
        'elements': 'datetime,temp,precip,humidity'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Sum rainfall over 7 days
        total_rainfall = sum(day.get('precip', 0) for day in data['days'])
        
        # Average temperature
        avg_temp = sum(day['temp'] for day in data['days']) / len(data['days'])
        
        # Average humidity
        avg_humidity = sum(day['humidity'] for day in data['days']) / len(data['days'])
        
        return {
            'source': 'VisualCrossing',
            'rainfall': round(total_rainfall, 1),
            'temperature': round(avg_temp, 1),
            'humidity': round(avg_humidity, 1),
            'timestamp': int(datetime.now().timestamp()),
            'success': True
        }
    except Exception as e:
        print(f"❌ VisualCrossing Error: {e}")
        return {'source': 'VisualCrossing', 'success': False, 'error': str(e)}

def fetch_weather_api(lat: float, lon: float) -> Dict:
    """Fetch weather data from WeatherAPI.com"""
    url = 'http://api.weatherapi.com/v1/history.json'
    
    try:
        total_rainfall = 0
        total_temp = 0
        total_humidity = 0
        count = 0
        
        # Fetch last 7 days
        for i in range(7):
            date = datetime.now() - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            params = {
                'key': API_KEYS['weather_api'],
                'q': f"{lat},{lon}",
                'dt': date_str
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            day = data['forecast']['forecastday'][0]['day']
            total_rainfall += day.get('totalprecip_mm', 0)
            total_temp += day['avgtemp_c']
            total_humidity += day['avghumidity']
            count += 1
        
        return {
            'source': 'WeatherAPI',
            'rainfall': round(total_rainfall, 1),
            'temperature': round(total_temp / count, 1),
            'humidity': round(total_humidity / count, 1),
            'timestamp': int(datetime.now().timestamp()),
            'success': True
        }
    except Exception as e:
        print(f"❌ WeatherAPI Error: {e}")
        return {'source': 'WeatherAPI', 'success': False, 'error': str(e)}

def fetch_openweathermap(lat: float, lon: float) -> Dict:
    """Fetch weather data from OpenWeatherMap"""
    url = 'https://api.openweathermap.org/data/2.5/weather'
    
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEYS['openweathermap'],
        'units': 'metric'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # OpenWeatherMap free tier doesn't have 7-day historical rainfall
        # Using current conditions as approximation
        rainfall = data.get('rain', {}).get('1h', 0) * 24 * 7  # Extrapolate
        
        return {
            'source': 'OpenWeatherMap',
            'rainfall': round(rainfall, 1),
            'temperature': round(data['main']['temp'], 1),
            'humidity': round(data['main']['humidity'], 1),
            'timestamp': int(datetime.now().timestamp()),
            'success': True
        }
    except Exception as e:
        print(f"❌ OpenWeatherMap Error: {e}")
        return {'source': 'OpenWeatherMap', 'success': False, 'error': str(e)}

def calculate_consensus(weather_data: List[Dict]) -> Dict:
    """Calculate consensus from multiple sources (2/3 agreement)"""
    if len(weather_data) < 2:
        raise ValueError('Need at least 2 sources for consensus')
    
    # Get median values
    rainfall_values = sorted([d['rainfall'] for d in weather_data])
    temp_values = sorted([d['temperature'] for d in weather_data])
    humidity_values = sorted([d['humidity'] for d in weather_data])
    
    median_rainfall = statistics.median(rainfall_values)
    median_temp = statistics.median(temp_values)
    median_humidity = statistics.median(humidity_values)
    
    # Check if values are within 20% of each other (consensus threshold)
    rainfall_consensus = all(
        abs(v - median_rainfall) / (median_rainfall + 0.1) <= 0.2 
        for v in rainfall_values
    )
    
    return {
        'rainfall': round(median_rainfall, 1),
        'temperature': round(median_temp, 1),
        'humidity': round(median_humidity, 1),
        'consensus': rainfall_consensus,
        'sources': [d['source'] for d in weather_data]
    }

def get_drought_severity(rainfall: float) -> Dict:
    """Determine drought severity based on rainfall"""
    if rainfall == 0:
        return {
            'severity': 'SEVERE',
            'multiplier': 150,
            'description': 'Severe drought - Coffee plants dying'
        }
    elif rainfall < 5:
        return {
            'severity': 'MODERATE',
            'multiplier': 130,
            'description': 'Moderate drought - Coffee plants stressed'
        }
    elif rainfall < 10:
        return {
            'severity': 'MILD',
            'multiplier': 115,
            'description': 'Mild drought - Coffee plants struggling'
        }
    else:
        return {
            'severity': 'NORMAL',
            'multiplier': 100,
            'description': 'Normal conditions - Coffee plants healthy'
        }

def main():
    """Main function to fetch and process weather data"""
    print('🌦️  Fetching Weather Data for Agri-Hook\n')
    print(f"📍 Location: {TEST_LOCATION['name']}")
    print(f"   Coordinates: {TEST_LOCATION['latitude']}, {TEST_LOCATION['longitude']}\n")
    
    weather_data = []
    
    # Fetch from all sources
    print('Fetching from VisualCrossing...')
    vc = fetch_visual_crossing(TEST_LOCATION['latitude'], TEST_LOCATION['longitude'])
    if vc['success']:
        weather_data.append(vc)
        print(f"✅ VisualCrossing: {vc['rainfall']}mm rainfall, {vc['temperature']}°C, {vc['humidity']}% humidity")
    
    print('\nFetching from WeatherAPI...')
    wa = fetch_weather_api(TEST_LOCATION['latitude'], TEST_LOCATION['longitude'])
    if wa['success']:
        weather_data.append(wa)
        print(f"✅ WeatherAPI: {wa['rainfall']}mm rainfall, {wa['temperature']}°C, {wa['humidity']}% humidity")
    
    print('\nFetching from OpenWeatherMap...')
    owm = fetch_openweathermap(TEST_LOCATION['latitude'], TEST_LOCATION['longitude'])
    if owm['success']:
        weather_data.append(owm)
        print(f"✅ OpenWeatherMap: {owm['rainfall']}mm rainfall, {owm['temperature']}°C, {owm['humidity']}% humidity")
    
    # Calculate consensus
    print('\n' + '=' * 60)
    print('📊 CONSENSUS CALCULATION\n')
    
    if len(weather_data) < 2:
        print('❌ Not enough data sources (need at least 2)')
        return
    
    consensus = calculate_consensus(weather_data)
    print(f"Sources: {', '.join(consensus['sources'])}")
    print(f"Consensus: {'✅ ACHIEVED' if consensus['consensus'] else '⚠️  NO CONSENSUS'}")
    print(f"\nMedian Values:")
    print(f"  Rainfall (7 days): {consensus['rainfall']}mm")
    print(f"  Temperature: {consensus['temperature']}°C")
    print(f"  Humidity: {consensus['humidity']}%")
    
    # Determine drought severity
    drought = get_drought_severity(consensus['rainfall'])
    print('\n' + '=' * 60)
    print('🌾 DROUGHT ANALYSIS\n')
    print(f"Severity: {drought['severity']}")
    print(f"Price Multiplier: {drought['multiplier']}%")
    print(f"Description: {drought['description']}")
    
    # Calculate adjusted price
    base_price = 5.0  # $5 per bag
    adjusted_price = (base_price * drought['multiplier']) / 100
    impact = drought['multiplier'] - 100
    
    print(f"\nBase Coffee Price: ${base_price:.2f}")
    print(f"Adjusted Price: ${adjusted_price:.2f}")
    print(f"Impact: {'+' if impact > 0 else ''}{impact}%")
    
    # Generate smart contract data
    print('\n' + '=' * 60)
    print('📝 SMART CONTRACT DATA\n')
    print('WeatherData struct:')
    print('{')
    print(f"  rainfall: {int(consensus['rainfall'] * 100)}, // {consensus['rainfall']}mm × 100")
    print(f"  temperature: {int(consensus['temperature'] * 100)}, // {consensus['temperature']}°C × 100")
    print(f"  soilMoisture: 0, // Not available from APIs")
    print(f"  latitude: {int(TEST_LOCATION['latitude'] * 1e6)}, // {TEST_LOCATION['latitude']} × 1e6")
    print(f"  longitude: {int(TEST_LOCATION['longitude'] * 1e6)}, // {TEST_LOCATION['longitude']} × 1e6")
    print(f"  timestamp: {int(datetime.now().timestamp())}")
    print('}')
    
    print('\n✅ Weather data fetch complete!\n')
    
    # Save to JSON file
    output = {
        'location': TEST_LOCATION,
        'timestamp': datetime.now().isoformat(),
        'raw_data': weather_data,
        'consensus': consensus,
        'drought_analysis': drought,
        'price_impact': {
            'base_price': base_price,
            'adjusted_price': adjusted_price,
            'impact_percent': impact
        }
    }
    
    with open('weather_data_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print('💾 Data saved to weather_data_output.json')

if __name__ == '__main__':
    main()
