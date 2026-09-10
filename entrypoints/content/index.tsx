import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";

import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/entrypoints/content/app";
import { I18nProvider } from "@/lib/use-i18n";

import "@/assets/tailwind.css";

const queryClient = new QueryClient();

export default defineContentScript({
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      anchor: "body",
      name: "assign-watch-ui",
      onMount: (container) => {
        const app = document.createElement("div");
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <I18nProvider>
                <App />
              </I18nProvider>
            </TooltipProvider>
          </QueryClientProvider>
        );
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
      position: "overlay",
    });

    ui.autoMount();
  },
  matches: ["https://app.leb2.org/*"],
});
