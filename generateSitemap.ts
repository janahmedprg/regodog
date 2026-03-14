import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";
import * as fs from "fs";
import path from "node:path";
import { getDocs, collection, getFirestore } from "firebase/firestore"; // adjust path
import { initializeApp } from "firebase/app";
import { HeaderTags } from "./src/components/HeaderTags";
import "dotenv/config";

const buildFolder = "./dist";
const clientBuildFolder = path.join(buildFolder, "client");

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId:  process.env.VITE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type RawNewsDocument = {
  title?: unknown;
  thumbnailUrl?: unknown;
  thumbnailAltText?: unknown;
  embeddedImageUrls?: unknown;
  editorStateUrl?: unknown;
};

type SitemapImageEntry = {
  url: string;
  title?: string;
  caption?: string;
};

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function getStoragePathFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const urlObj = new URL(downloadUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (!pathMatch) {
      return null;
    }
    return decodeURIComponent(pathMatch[1]);
  } catch {
    return null;
  }
}

function isArticleImageUrl(url: string): boolean {
  const storagePath = getStoragePathFromDownloadUrl(url);
  return typeof storagePath === "string" && storagePath.startsWith("article_images/");
}

function normalizeImageUrls(
  ...values: Array<string | undefined | null>
): string[] {
  const urls = new Set<string>();
  values.forEach((value) => {
    if (isValidUrl(value)) {
      urls.add(new URL(value).toString());
    }
  });
  return Array.from(urls);
}

function collectFromSerializedStateWithAlt(
  node: unknown,
  result: Map<string, string>,
): void {
  if (node === null || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectFromSerializedStateWithAlt(item, result));
    return;
  }

  const objectNode = node as Record<string, unknown>;
  const src = objectNode.src;
  if (typeof src === "string" && isValidUrl(src) && isArticleImageUrl(src)) {
    const trimmedSrc = src.trim();
    const altCandidate = objectNode.altText ?? objectNode.alt;
    if (typeof altCandidate === "string") {
      const altText = altCandidate.trim();
      if (!result.has(trimmedSrc) || altText) {
        result.set(trimmedSrc, altText);
      }
    } else if (!result.has(trimmedSrc)) {
      result.set(trimmedSrc, "");
    }
  }

  for (const value of Object.values(objectNode)) {
    collectFromSerializedStateWithAlt(value, result);
  }
}

async function extractImageEntriesFromEditorStateUrl(
  editorStateUrl: string | undefined,
): Promise<SitemapImageEntry[]> {
  if (!editorStateUrl || !isValidUrl(editorStateUrl)) {
    return [];
  }

  try {
    const response = await fetch(editorStateUrl);
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as unknown;
    const imageMap = new Map<string, string>();
    collectFromSerializedStateWithAlt(payload, imageMap);

    return Array.from(imageMap.entries())
      .filter(([url]) => isArticleImageUrl(url))
      .map(([url, altText]) => ({
        url,
        ...(altText ? { title: altText, caption: altText } : {}),
      }));
  } catch (error) {
    console.warn("Error parsing editor state for sitemap image metadata:", error);
    return [];
  }
}

const startSiteMapGeneratorJob = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "news"));
    const docs = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
      const data = doc.data() as RawNewsDocument;
      const thumbnailUrl =
        typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : undefined;
      const normalizedThumbnailUrl =
        thumbnailUrl && isValidUrl(thumbnailUrl) ? new URL(thumbnailUrl).toString() : null;
      const rawThumbnailAltText =
        typeof data.thumbnailAltText === "string" ? data.thumbnailAltText : "";
      const thumbnailAltText = rawThumbnailAltText.trim();
      const embeddedImageUrls =
        Array.isArray(data.embeddedImageUrls)
          ? data.embeddedImageUrls.filter((url): url is string =>
              isValidUrl(url),
            )
          : [];
      const articleImageUrls = normalizeImageUrls(
        thumbnailUrl,
        ...embeddedImageUrls,
      );
      const imageEntries = articleImageUrls.map((url) => {
        if (normalizedThumbnailUrl && url === normalizedThumbnailUrl && thumbnailAltText) {
          return {
            url,
            title: thumbnailAltText,
            caption: thumbnailAltText,
          };
        }
        return { url };
      });

      const editorStateImageEntries = await extractImageEntriesFromEditorStateUrl(
        typeof data.editorStateUrl === "string" ? data.editorStateUrl : undefined,
      );

      const mergedImageEntries = new Map<string, SitemapImageEntry>();
      imageEntries.forEach((entry) => {
        mergedImageEntries.set(entry.url, entry);
      });
      editorStateImageEntries.forEach((entry) => {
        const existing = mergedImageEntries.get(entry.url);
        mergedImageEntries.set(
          entry.url,
          existing && existing.title ? existing : entry,
        );
      });

      return {
        id: doc.id,
        images: Array.from(mergedImageEntries.values()),
      };
    })
    );

    // Array with the links
    const links = [
      ...docs.map((doc) => ({
        url: `/article/${doc.id}`,
        img: doc.images,
        ...(doc.images.length > 0 ? { lastmod: new Date().toISOString() } : {}),
      })),
      ...Object.values(HeaderTags).map((tag: string) => ({ url: `/${tag}` })),
      { url: "/auth" },
    ];

    if (links.length > 0) {
      // Ensure build folders exist
      [buildFolder, clientBuildFolder].forEach((folder) => {
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
      });

      // Create sitemap
      const stream = new SitemapStream({ hostname: "https://regodog.com" });
      const data = await streamToPromise(Readable.from(links).pipe(stream));

      const sitemapPath = `${buildFolder}/sitemap.xml`;
      const clientSitemapPath = `${clientBuildFolder}/sitemap.xml`;
      fs.writeFileSync(sitemapPath, data.toString());
      fs.writeFileSync(clientSitemapPath, data.toString());
      console.log("Sitemap Generated ✅");
    } else {
      console.log("No Sitemap Generated ❌");
    }
  } catch (error) {
    console.error("Sitemap generator error:", error);
  }
};

export default startSiteMapGeneratorJob;

// Run immediately if executed directly
startSiteMapGeneratorJob().then(() => process.exit(0));
