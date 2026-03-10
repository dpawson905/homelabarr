export interface WeatherResponse {
  station: {
    name: string
    stationId: number
  }
  current: {
    temperature: number // °F
    feelsLike: number // °F
    humidity: number // %
    pressure: number // inHg
    windSpeed: number // mph
    windGust: number // mph
    windDirection: number // degrees
    uvIndex: number
    solarRadiation: number // W/m²
    rainToday: number // in
    lightningCount3hr: number
    weatherCode: number // WMO code derived from conditions
  }
  forecast: {
    daily: ForecastDay[]
  } | null
}

export interface ForecastDay {
  day: string // ISO date
  tempHigh: number // °F
  tempLow: number // °F
  precip: number // in
  precipProbability: number // %
  icon: string // condition icon name
  conditions: string // text description
}

/** Raw Tempest observation response */
export interface TempestObservationResponse {
  obs: TempestObservation[]
  station_id: number
  station_name: string
  status: { status_code: number; status_message: string }
}

export interface TempestObservation {
  air_temperature: number // °C
  feels_like: number // °C
  relative_humidity: number
  sea_level_pressure: number // mb
  wind_avg: number // m/s
  wind_gust: number // m/s
  wind_direction: number
  uv: number
  solar_radiation: number
  precip_accum_local_day: number // mm
  lightning_strike_count_last_3hr: number
  timestamp: number
}

/** Raw Tempest forecast response */
export interface TempestForecastResponse {
  forecast: {
    daily: TempestForecastDay[]
  }
  status: { status_code: number; status_message: string }
}

export interface TempestForecastDay {
  day_start_local: number // epoch
  air_temp_high: number // °C
  air_temp_low: number // °C
  precip: number // mm
  precip_probability: number // %
  icon: string
  conditions: string
}
