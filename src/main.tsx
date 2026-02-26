import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import type { SSRData } from "./ssr/types";

declare global {
  interface Window {
    __SSR_DATA__?: SSRData;
  }
}

const initialData = window.__SSR_DATA__;

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <BrowserRouter>
      <App initialData={initialData} />
    </BrowserRouter>
  </StrictMode>
);
