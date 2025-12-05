import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: [
    "@wxt-dev/module-react",
    "@wxt-dev/auto-icons",
    "@wxt-dev/i18n/module",
  ],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Assign Watch - Extension for LEB2",
    permissions: ["storage", "notifications", "alarms"],
    default_locale: "en",
  },
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (DEV)";
      }
    },
  },
});
