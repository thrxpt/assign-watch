import App from "@/entrypoints/content/App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";

import "@/assets/tailwind.css";
import "@fontsource-variable/anuphan";

// Suppress console.error and console.warn from radix-ui's Dialog
if (process.env.NODE_ENV === "production") {
  console.error = () => {};
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
          </QueryClientProvider>,
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
