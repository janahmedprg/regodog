import fs from "node:fs/promises";
import path from "node:path";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 60,
});

const MIME_TYPES = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let initialized = false;
let template = "";
let render;

function sanitizePathname(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  if (decoded.includes("..")) {
    return null;
  }
  return decoded;
}

function injectSSRData(html, initialData) {
  const serializedData = JSON.stringify(initialData ?? {}).replace(/</g, "\\u003c");
  const script = `<script>window.__SSR_DATA__=${serializedData};</script>`;
  return html.replace("</body>", `${script}</body>`);
}

async function initSSR() {
  if (initialized) {
    return;
  }

  const cwd = process.cwd();
  const templatePath = path.resolve(cwd, "dist/client/index.html");
  const serverEntryPath = path.resolve(cwd, "dist/server/entry-server.js");

  template = await fs.readFile(templatePath, "utf-8");
  ({ render } = await import(serverEntryPath));

  initialized = true;
}

async function serveStaticAsset(res, pathname) {
  const safePath = sanitizePathname(pathname);
  if (!safePath) {
    return false;
  }

  const distRoot = path.resolve(process.cwd(), "dist/client");
  const filePath = path.resolve(distRoot, `.${safePath}`);

  if (!filePath.startsWith(distRoot)) {
    return false;
  }

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.set("Content-Type", contentType);
    res.set("Content-Length", String(data.byteLength));
    res.set(
      "Cache-Control",
      safePath.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600"
    );

    res.status(200).send(data);
    return true;
  } catch {
    return false;
  }
}

export const ssrApp = onRequest(async (req, res) => {
  try {
    await initSSR();

    const requestUrl = req.originalUrl || req.url || "/";
    const pathname = requestUrl.split("?")[0] || "/";
    const isAssetRequest = pathname.includes(".") || pathname.startsWith("/assets/");

    if (isAssetRequest) {
      const served = await serveStaticAsset(res, pathname);
      if (served) {
        return;
      }

      res.status(404).send("Not Found");
      return;
    }

    const { appHtml, initialData } = await render(requestUrl);
    const htmlWithApp = template.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );

    const html = injectSSRData(htmlWithApp, initialData);

    res.set("Content-Type", "text/html");
    res.set("Cache-Control", "public, max-age=0, must-revalidate");
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
