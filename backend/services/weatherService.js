const axios = require('axios');

class WeatherService {
  constructor() {
    this.baseURL = process.env.WEATHER_API_BASE_URL || 'https://wttr.in';
    this.timeout = parseInt(process.env.WEATHER_TIMEOUT) || 15000; // 15 seconds default
  }

  // Get weather data from wttr.in
  async getWeather(location = 'Ho Chi Minh City') {
    try {
      const response = await axios.get(`${this.baseURL}/${encodeURIComponent(location)}`, {
        params: {
          format: 'j1', // JSON format
          lang: 'vi'    // Vietnamese language
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'NAVIN-AGENT-AI/1.0'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Weather API error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process weather data for AI consumption
  processWeatherData(weatherData) {
    if (!weatherData || !weatherData.current_condition || !weatherData.weather) {
      return {
        error: 'Dữ liệu thời tiết không hợp lệ'
      };
    }

    const current = weatherData.current_condition[0];
    const today = weatherData.weather[0];
    const forecast = weatherData.weather.slice(1, 4); // Next 3 days

    return {
      location: weatherData.nearest_area?.[0]?.areaName?.[0]?.value || 'Không xác định',
      current: {
        temperature: `${current.temp_C}°C`,
        feelsLike: `${current.FeelsLikeC}°C`,
        humidity: `${current.humidity}%`,
        description: current.lang_vi?.[0]?.value || current.weatherDesc?.[0]?.value || 'Không rõ',
        windSpeed: `${current.windspeedKmph} km/h`,
        windDirection: current.winddir16Point,
        pressure: `${current.pressure} mb`,
        visibility: `${current.visibility} km`,
        uvIndex: current.uvIndex
      },
      today: {
        maxTemp: `${today.maxtempC}°C`,
        minTemp: `${today.mintempC}°C`,
        sunrise: today.astronomy?.[0]?.sunrise || 'N/A',
        sunset: today.astronomy?.[0]?.sunset || 'N/A',
        chanceOfRain: today.hourly?.[0]?.chanceofrain || '0'
      },
      forecast: forecast.map(day => ({
        date: day.date,
        maxTemp: `${day.maxtempC}°C`,
        minTemp: `${day.mintempC}°C`,
        description: day.hourly?.[0]?.lang_vi?.[0]?.value || day.hourly?.[0]?.weatherDesc?.[0]?.value || 'Không rõ',
        chanceOfRain: day.hourly?.[0]?.chanceofrain || '0'
      }))
    };
  }

  // Get processed weather data
  async getProcessedWeather(location = 'Ho Chi Minh City') {
    const weatherResult = await this.getWeather(location);
    
    if (!weatherResult.success) {
      return {
        success: false,
        error: weatherResult.error,
        data: null
      };
    }

    const processedData = this.processWeatherData(weatherResult.data);
    
    if (processedData.error) {
      return {
        success: false,
        error: processedData.error,
        data: null
      };
    }

    return {
      success: true,
      data: processedData
    };
  }

  // Extract location from user input
  extractLocation(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    // Common Vietnamese city names
    const cities = {
      'hồ chí minh': 'Ho Chi Minh City',
      'sài gòn': 'Ho Chi Minh City',
      'saigon': 'Ho Chi Minh City',
      'hà nội': 'Hanoi',
      'hanoi': 'Hanoi',
      'đà nẵng': 'Da Nang',
      'da nang': 'Da Nang',
      'huế': 'Hue',
      'hue': 'Hue',
      'cần thơ': 'Can Tho',
      'can tho': 'Can Tho',
      'nha trang': 'Nha Trang',
      'vũng tàu': 'Vung Tau',
      'vung tau': 'Vung Tau',
      'đà lạt': 'Da Lat',
      'da lat': 'Da Lat'
    };

    for (const [vietnamese, english] of Object.entries(cities)) {
      if (lowerInput.includes(vietnamese)) {
        return english;
      }
    }

    // Default location
    return 'Ho Chi Minh City';
  }

  // Check if input is weather-related and get weather
  async handleWeatherRequest(userInput) {
    const location = this.extractLocation(userInput);
    return await this.getProcessedWeather(location);
  }
}

module.exports = new WeatherService();
