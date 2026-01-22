import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/entrypoints/popup/app";

import "@/assets/tailwind.css";
import "@fontsource-variable/anuphan";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
