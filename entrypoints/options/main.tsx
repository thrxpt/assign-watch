import React from "react";
import ReactDOM from "react-dom/client";

import { MotionPreferencesProvider } from "@/components/motion-preferences";
import App from "@/entrypoints/options/app";

import "@/assets/tailwind.css";

const root = document.querySelector("#root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MotionPreferencesProvider>
        <App />
      </MotionPreferencesProvider>
    </React.StrictMode>
  );
}
