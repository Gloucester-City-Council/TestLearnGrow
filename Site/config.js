// Azure Static Web Apps — API is on the same domain at /api/data
// For local dev with a local Azure Function, override API_URL:
//   window.SW_CONFIG = { API_URL: 'http://localhost:7071/api/data' };
// Without an API the app falls back to localStorage automatically.

window.SW_CONFIG = {
  API_URL: '/api',
};
