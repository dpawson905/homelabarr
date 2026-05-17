/** Normalized response returned by our weather API route */
export interface WeatherResponse {
  location: {
    name: string
    country: string
    lat: number
    lon: number
  }
  current: {
    temp: number
    feelsLike: number
    tempMin: number
    tempMax: number
    humidity: number
    pressure: number // hPa
    visibility: number // metres
    windSpeed: number
    windDeg: number
    windGust?: number
    clouds: number // %
    description: string
    icon: string // OWM icon id
    conditionId: number // OWM condition code
    sunrise: number // unix
    sunset: number // unix
    dt: number // unix
  }
  airQuality: {
    aqi: number // 1-5
    pm2_5: number
    pm10: number
    o3: number
    no2: number
  } | null
  forecast: ForecastDay[]
}

export interface ForecastDay {
  date: string // ISO date YYYY-MM-DD
  tempHigh: number
  tempLow: number
  icon: string
  conditionId: number
  description: string
  pop: number // probability of precipitation 0-100
}

/** Raw OWM current weather response (subset) */
export interface OWMCurrentResponse {
  coord: { lon: number; lat: number }
  weather: { id: number; main: string; description: string; icon: string }[]
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  visibility: number
  wind: { speed: number; deg: number; gust?: number }
  clouds: { all: number }
  dt: number
  sys: { country: string; sunrise: number; sunset: number }
  timezone: number
  name: string
}

/** Raw OWM 5-day forecast response (subset) */
export interface OWMForecastResponse {
  list: {
    dt: number
    main: { temp: number; temp_min: number; temp_max: number }
    weather: { id: number; description: string; icon: string }[]
    pop: number
  }[]
  city: {
    name: string
    country: string
    timezone: number
    sunrise: number
    sunset: number
  }
}

/** Raw OWM air pollution response (subset) */
export interface OWMAirPollutionResponse {
  list: {
    main: { aqi: number }
    components: {
      pm2_5: number
      pm10: number
      o3: number
      no2: number
      co: number
      so2: number
      no: number
      nh3: number
    }
  }[]
}

/** Raw OWM geocoding response */
export interface OWMGeocodingResult {
  name: string
  local_names?: Record<string, string>
  lat: number
  lon: number
  country: string
  state?: string
}
