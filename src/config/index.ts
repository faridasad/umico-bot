export const config = {
  server: {
    port: process.env.PORT || 3761,
    host: process.env.HOST || "0.0.0.0",
  },
  api: {
    baseUrl: process.env.API_BASE_URL || "https://bbu.umico.az/api/v1",
  },
  auth: {
    // Store credentials in environment variables in production
    username: process.env.AUTH_USERNAME || '994998000187-761',
    password: process.env.AUTH_PASSWORD || '1Xc1Vu1m',
  }
};
