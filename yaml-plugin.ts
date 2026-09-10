import { parse } from "yaml";

export function yamlPlugin() {
  return {
    name: "vite-plugin-yaml",
    transform(code: string, id: string) {
      if (id.endsWith(".yml") || id.endsWith(".yaml")) {
        const parsed = parse(code);
        return {
          code: `export default ${JSON.stringify(parsed)};`,
          map: null,
        };
      }
    },
  };
}
