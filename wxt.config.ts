import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "Assign Watch - Extension for LEB2",
    permissions: ["storage", "notifications", "alarms"],
  },
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (DEV)"
      }

      if (wxt.config.browser === "firefox") {
        manifest.browser_specific_settings = {
          gecko: {
            id: "assignwatch@leb2",
          },
        }
      }
    },
  },
})
