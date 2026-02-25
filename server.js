import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 5173;
const root = process.cwd();

let vite;
let prodTemplate = "";
let prodRender;

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

if (isProd) {
  prodTemplate = await fs.readFile(path.resolve(root, "dist/client/index.html"), "utf-8");
  const serverEntry = path.resolve(root, "dist/server/entry-server.js");
  ({ render: prodRender } = await import(serverEntry));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });
}

function sanitizePathname(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  if (decoded.includes("..")) {
    return null;
  }
  return decoded;
}

async function serveStatic(req, res, pathname) {
  const safePath = sanitizePathname(pathname);
  if (!safePath) {
    return false;
  }

  const distRoot = path.resolve(root, "dist/client");
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
    res.writeHead(200, {
      "Content-Length": data.byteLength,
      "Content-Type": contentType,
      "Cache-Control": safePath.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = req.url || "/";
  const pathname = requestUrl.split("?")[0] || "/";

  try {
    if (!isProd) {
      await new Promise((resolve, reject) => {
        vite.middlewares(req, res, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      if (res.writableEnded) {
        return;
      }

      const template = await fs.readFile(path.resolve(root, "index.html"), "utf-8");
      const transformedTemplate = await vite.transformIndexHtml(requestUrl, template);
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const appHtml = await render(requestUrl);

      const html = transformedTemplate.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    const isAssetRequest = pathname.includes(".") || pathname.startsWith("/assets/");
    if (isAssetRequest) {
      const served = await serveStatic(req, res, pathname);
      if (served) {
        return;
      }
    }

    const appHtml = await prodRender(requestUrl);
    const html = prodTemplate.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } catch (error) {
    if (!isProd && vite) {
      vite.ssrFixStacktrace(error);
    }
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
