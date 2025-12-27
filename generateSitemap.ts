import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";
import * as fs from "fs";
import { getDocs, collection, getFirestore } from "firebase/firestore"; // adjust path
import { initializeApp } from "firebase/app";
import { HeaderTags } from "./src/components/HeaderTags";
import "dotenv/config";

const buildFolder = "./dist";

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

const startSiteMapGeneratorJob = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "news"));
    const ids = querySnapshot.docs.map((doc) => ({ id: doc.id }));

    if (ids.length > 0) {
      // Array with the links
      const links = [
        ...ids.map((id) => ({ url: `/article/${id.id}` })),
        ...Object.values(HeaderTags).map((tag: string) => ({ url: `/${tag}` })),
        { url: "/auth" },
      ];

      // Ensure build folder exists
      if (!fs.existsSync(buildFolder)) {
        fs.mkdirSync(buildFolder, { recursive: true });
      }

      // Create sitemap
      const stream = new SitemapStream({ hostname: "https://regodog.com" });
      const data = await streamToPromise(Readable.from(links).pipe(stream));

      fs.writeFileSync(`${buildFolder}/sitemap.xml`, data.toString());
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

