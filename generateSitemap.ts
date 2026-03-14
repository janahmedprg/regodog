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
  embeddedImageUrls?: unknown;
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

const startSiteMapGeneratorJob = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "news"));
    const docs = querySnapshot.docs.map((doc) => {
      const data = doc.data() as RawNewsDocument;
      const embeddedImageUrls =
        Array.isArray(data.embeddedImageUrls)
          ? data.embeddedImageUrls.filter((url): url is string =>
              isValidUrl(url),
            )
          : [];
      const articleImageUrls = normalizeImageUrls(
        typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : undefined,
        ...embeddedImageUrls,
      );

      return {
        id: doc.id,
        images: articleImageUrls.map((url) => ({ url })),
      };
    });

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
      }

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
