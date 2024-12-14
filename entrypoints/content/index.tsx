import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ReactDOM from "react-dom/client"

import App from "@/entrypoints/content/app"

const queryClient = new QueryClient()

export default defineContentScript({
  matches: ["https://app.leb2.org/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    if (ctx.isInvalid) return
    const ui = createIntegratedUi(ctx, {
      position: "inline",
      append: "last",
      anchor: ".nav.navbar-nav.page-menu.flex-container.fxf-rnw",
      onMount: (container) => {
        const root = ReactDOM.createRoot(container)
        root.render(
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        )
        return { root }
      },
      onRemove: (elements) => {
        elements?.root.unmount()
      },
    })

    ui.mount()
  },
})
