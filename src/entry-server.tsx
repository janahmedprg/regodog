import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App";
import "./index.css";
import { getInitialData } from "./ssr/getInitialData";
import type { SSRData } from "./ssr/types";

export async function render(url: string) {
  const initialData: SSRData = await getInitialData(url);
  const appHtml = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App initialData={initialData} />
      </StaticRouter>
    </StrictMode>
  );

  return { appHtml, initialData };
}
