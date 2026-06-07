// config.js is committed with API_URL: '/api/data' for Azure Static Web Apps deployment.
// That path works because SWA serves the API on the same domain — no secrets needed.
//
// For local dev against a local Azure Function (func start):
//   Change API_URL to 'http://localhost:7071/api'
//
// Without an API (pure local dev), leave API_URL empty or absent and the app
// falls back to localStorage automatically.

window.SW_CONFIG = {
  API_URL: '/api',

  // Optional — override display strings shown in the UI
  // network_name: 'South West Test & Learn Network',
  // season_label: 'Season 3 — The Reorganisation Arc',
};
