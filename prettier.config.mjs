/** @type {import("prettier").Config} */
const config = {
  endOfLine: "lf",
  trailingComma: "es5",
  tabWidth: 2,
  semi: false,
  singleQuote: false,
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^types$",
    "^@/types/(.*)$",
    "^@/assets/(.*)$",
    "^@/entrypoints/(.*)$",
    "",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
}

export default config
