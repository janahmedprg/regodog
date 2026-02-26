import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 60,
  maxInstances: 10,
});

if (!getApps().length) {
  initializeApp();
}

const adminDb = getFirestore();

const MIME_TYPES: Record<string, string> = {
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

type SSRRender = (url: string) => Promise<{
  appHtml: string;
  initialData: unknown;
}>;

let initialized = false;
let template = "";
let render: SSRRender;

function projectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  const libDir = path.dirname(currentFile);
  return path.resolve(libDir, "..");
}

function sanitizePathname(urlPathname: string) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  if (decoded.includes("..")) {
    return null;
  }
  return decoded;
}

function buildClientHydrationData(initialData: unknown) {
  if (!initialData || typeof initialData !== "object") {
    return initialData ?? {};
  }

  const data = initialData as Record<string, unknown>;
  const article =
    data.article && typeof data.article === "object"
      ? { ...(data.article as Record<string, unknown>) }
      : undefined;
  if (article) {
    if ("htmlContent" in article) {
      delete article.htmlContent;
    }
    // Keep article HTML in SSR markup, not in the hydration payload.
    // Also drop heavy fallback content when the article has HTML content.
    if ("htmlContentUrl" in article && "content" in article) {
      delete article.content;
    }
    // Editor state URL is only required inside edit mode and can be refetched client-side.
    if ("editorStateUrl" in article) {
      delete article.editorStateUrl;
    }
  }

  const newsItems = Array.isArray(data.newsItems)
    ? data.newsItems.map((item) => {
        if (!item || typeof item !== "object") {
          return item;
        }
        const cleaned = { ...(item as Record<string, unknown>) };
        if ("htmlContent" in cleaned) {
          delete cleaned.htmlContent;
        }
        return cleaned;
      })
    : undefined;

  return {
    ...data,
    ...(article ? { article } : {}),
    ...(newsItems ? { newsItems } : {}),
  };
}

function injectSSRData(html: string, initialData: unknown) {
  const clientHydrationData = buildClientHydrationData(initialData);
  const serialized = JSON.stringify(clientHydrationData).replace(/</g, "\\u003c");
  const script = `<script>window.__SSR_DATA__=${serialized};</script>`;
  return html.replace("</body>", `${script}</body>`);
}

async function initSSR() {
  if (initialized) {
    return;
  }

  const root = projectRoot();
  const templatePath = path.resolve(root, "dist/client/index.html");
  const serverEntryPath = path.resolve(root, "dist/server/entry-server.js");

  template = await fs.readFile(templatePath, "utf-8");
  const serverEntryUrl = pathToFileURL(serverEntryPath).href;
  ({ render } = await import(serverEntryUrl));

  initialized = true;
}

async function serveStaticAsset(
  res: Parameters<Parameters<typeof onRequest>[0]>[1],
  pathname: string
) {
  const safePath = sanitizePathname(pathname);
  if (!safePath) {
    return false;
  }

  const distRoot = path.resolve(projectRoot(), "dist/client");
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

export const notifyNewsletterOnArticleCreate = onDocumentCreated(
  "news/{articleId}",
  async (event) => {
    const article = event.data?.data();
    const articleId = event.params.articleId;

    if (!article || !articleId) {
      return;
    }

    const title = typeof article.title === "string" ? article.title.trim() : "";
    if (!title) {
      console.warn("Skipping newsletter send: article has no title", { articleId });
      return;
    }

    const configuredSiteUrl = "https://regodog.com";
    const articleUrl = `${configuredSiteUrl.replace(/\/+$/, "")}/article/${articleId}`;

    const usersSnapshot = await adminDb
      .collection("user-info")
      .where("newsletterOptIn", "==", true)
      .get();

    const recipients = Array.from(
      new Set(
        usersSnapshot.docs
          .map((doc) => doc.get("email"))
          .filter((email): email is string => typeof email === "string" && Boolean(email.trim()))
          .map((email) => email.trim().toLowerCase())
      )
    );

    if (!recipients.length) {
      console.info("No newsletter recipients found", { articleId });
      return;
    }

    const subject = `New article: ${title}`;
    const textBody = `A new article is live: ${title}\n\nRead it here: ${articleUrl}`;
    const htmlBody = `
      <p>A new article is live:</p>
      <p><strong>${title}</strong></p>
      <p><a href="${articleUrl}">Read the article</a></p>
    `;

    await Promise.all(
      recipients.map((email) =>
        adminDb.collection("mail").add({
          to: email,
          message: {
            subject,
            text: textBody,
            html: htmlBody,
          },
        })
      )
    );

    console.info("Queued newsletter emails", {
      articleId,
      recipientCount: recipients.length,
    });
  }
);
