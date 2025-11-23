import React from "react";
import App from "@/entrypoints/popup/App";
import ReactDOM from "react-dom/client";

import "@/assets/tailwind.css";
import "@fontsource-variable/anuphan";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
