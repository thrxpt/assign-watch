import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/entrypoints/onboarding/app";

import "@/assets/tailwind.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
