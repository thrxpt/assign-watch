import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  runner: {
    disabled: true,
  },
  manifest: {
    permissions: ["storage", "notifications"],
  },
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (DEV)"
      }
    },
  },
})
