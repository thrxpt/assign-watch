import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import App from "@/entrypoints/content/app";

import "@/assets/tailwind.css";
import "@fontsource-variable/anuphan";

if (process.env.NODE_ENV === "production") {
  // biome-ignore lint/suspicious/noEmptyBlockStatements: Suppress console.error and console.warn from radix-ui's Dialog
  console.error = () => {};
  // biome-ignore lint/suspicious/noEmptyBlockStatements: Suppress console.error and console.warn from radix-ui's Dialog
  console.warn = () => {};
}

const queryClient = new QueryClient();

export default defineContentScript({
  matches: ["https://app.leb2.org/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "assign-watch-ui",
      position: "overlay",
      anchor: "body",
      onMount: (container) => {
        const app = document.createElement("div");
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        );
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.autoMount();
  },
});
