## Plan 06-02 Summary: Weather Widget

### What was built
- `app/api/widgets/weather/route.ts` -- API proxy route that forwards requests to Open-Meteo with lat/lon/unit query parameters, 10-second fetch timeout, and 10-minute cache header
- `components/widgets/weather-widget.tsx` -- Full weather widget component with setup mode, settings panel, current conditions display, and 5-day forecast row
- Updated `components/widget-renderer.tsx` -- Added WeatherWidget import and "weather" case to the switch
- Updated `components/add-widget-dialog.tsx` -- Added `weather: { w: 3, h: 3 }` to WIDGET_DEFAULT_SIZES

### Decisions made
- Used `CloudIcon` from @hugeicons/core-free-icons for the widget header icon and `Location01Icon` for the "Use My Location" button
- Used Unicode escape sequences for weather emoji to avoid encoding issues in the WMO weather code mapper
- The weather data is fetched client-side via the proxy route to avoid CORS issues and enable server-side caching
- Settings panel follows the same inline toggle pattern established by ClockWidget (gear icon in header)
- Latitude/longitude are rounded to 4 decimal places when auto-detected via geolocation (approx 11m precision)
- Setup mode shows a friendly onboarding screen with a single "Set Up Location" button instead of immediately opening settings
- 10-minute polling interval matches the Cache-Control max-age on the proxy response
- date-fns `format` is used for day name abbreviations in the forecast row, with explicit `T00:00:00` suffix to avoid timezone parsing issues

### Issues encountered
- None
