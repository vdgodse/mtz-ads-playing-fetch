import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}
const root = rootEl;

async function bootstrap() {
  if (import.meta.env.DEV) {
    await import("./critical.css");
  }

  const app = (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  if (root.hasChildNodes()) {
    hydrateRoot(root, app);
    return;
  }

  createRoot(root).render(app);
}

void bootstrap();
