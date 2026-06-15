// Copy this file to config.js and edit for your deployment.
window.SW_CONFIG = {
  // For local dev with swa cli: keep '/api'. For production: '/api'
  API_URL: '/api',

  // 'swa' = Azure Static Web Apps Entra auth (production)
  // 'mock' = local dev picker (no real auth)
  AUTH_MODE: 'swa',

  // Optional: override specific config keys without going via the admin UI.
  // These are merged last and override both DEFAULT_CONFIG and the server blob.
  // config: {
  //   branding: { org_name: 'My Organisation' },
  // },
};
