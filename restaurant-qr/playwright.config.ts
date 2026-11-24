import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:4173",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: [
    {
      command: "node tests/browser/backend.mjs",
      url: "http://127.0.0.1:4321/health",
    },
    {
      command: "npm run dev -- --host localhost --port 4173 --strictPort",
      url: "http://localhost:4173",
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:4321",
        VITE_SUPABASE_PUBLISHABLE_KEY: "local-test-key",
      },
    },
  ],
});
