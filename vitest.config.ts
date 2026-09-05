import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

import { yamlPlugin } from "./yaml-plugin";

export default defineConfig({
  plugins: [WxtVitest(), yamlPlugin()],
});
