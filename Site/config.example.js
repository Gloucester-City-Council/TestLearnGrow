// Copy this file to config.js and fill in your Azure Function URL.
// config.js is git-ignored — never commit real URLs or credentials.
//
// Without config.js the app runs in local-only mode using localStorage.

window.SW_CONFIG = {
  API_URL: 'https://YOUR_FUNCTION_APP.azurewebsites.net/api/data',

  // Optional — override the display name and season label shown in the UI
  // network_name: 'South West Test & Learn Network',
  // season_label: 'Season 3 — The Reorganisation Arc',
};
