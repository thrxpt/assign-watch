import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

import { yamlPlugin } from "./yaml-plugin";

// See https://wxt.dev/api/config.html
export default defineConfig({
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (DEV)";
      }
    },
  },
  manifest: {
    default_locale: "en",
    name: "Assign Watch - Extension for LEB2",
    permissions: ["storage", "notifications", "alarms"],
  },
  modules: [
    "@wxt-dev/module-react",
    "@wxt-dev/auto-icons",
    "@wxt-dev/i18n/module",
  ],
  vite: () => ({
    plugins: [tailwindcss(), yamlPlugin()],
  }),
});
