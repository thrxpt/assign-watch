import React from "react"
import ReactDOM from "react-dom/client"

import "@/assets/tailwind.css"

import App from "@/entrypoints/popup/app"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
