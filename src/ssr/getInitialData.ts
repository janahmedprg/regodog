import { HeaderTags } from "../components/HeaderTags";
import type { SSRArticle, SSRData, SSRNewsItem } from "./types";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type RawNewsRecord = {
  id: string;
  title: string;
  content?: string;
  htmlContentUrl?: string;
  createdAt?: unknown;
  lastUpdated?: unknown;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
  tags?: string[];
  editorStateUrl?: string;
};

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(text: string, wordLimit: number): string {
  if (!text) {
    return "";
  }

  const words = text.split(/\s+/);
  if (words.length <= wordLimit) {
    return text;
  }

  return `${words.slice(0, wordLimit).join(" ")}...`;
}

function stripInlineBase64Images(html: string): string {
  // Inline base64 images can make SSR HTML extremely large.
  // Keep text/indexable content and let the client load full article HTML afterward.
  return html.replace(
    /<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*>/gi,
    ""
  );
}

function parseCreatedAt(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const numeric = Number.parseInt(value, 10);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in (value as Record<string, unknown>)
  ) {
    const record = value as {
      seconds: unknown;
      nanoseconds?: unknown;
    };
    if (typeof record.seconds === "number" && Number.isFinite(record.seconds)) {
      const seconds =
        record.seconds < 1_000_000_000_000 ? record.seconds * 1000 : record.seconds;
      const nanos = typeof record.nanoseconds === "number" ? record.nanoseconds : 0;
      const date = seconds + nanos / 1_000_000;
      return Number.isNaN(date) ? null : date;
    }
    if (typeof record.seconds === "string" && Number.isFinite(Number(record.seconds))) {
      const numeric = Number(record.seconds);
      const seconds = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
      const nanos =
        typeof record.nanoseconds === "number" ? record.nanoseconds : 0;
      const date = seconds + nanos / 1_000_000;
      return Number.isNaN(date) ? null : date;
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in (value as Record<string, unknown>)
  ) {
    const record = value as {
      _seconds: unknown;
      _nanoseconds?: unknown;
    };
    if (typeof record._seconds === "number" && Number.isFinite(record._seconds)) {
      const seconds =
        record._seconds < 1_000_000_000_000
          ? record._seconds * 1000
          : record._seconds;
      const nanos =
        typeof record._nanoseconds === "number" ? record._nanoseconds : 0;
      const date = seconds + nanos / 1_000_000;
      return Number.isNaN(date) ? null : date;
    }
    if (
      typeof record._seconds === "string" &&
      Number.isFinite(Number(record._seconds))
    ) {
      const numeric = Number(record._seconds);
      const seconds = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
      const nanos =
        typeof record._nanoseconds === "number" ? record._nanoseconds : 0;
      const date = seconds + nanos / 1_000_000;
      return Number.isNaN(date) ? null : date;
    }
  }

  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function firestoreValueToJs(value?: FirestoreValue): unknown {
  if (!value) {
    return undefined;
  }

  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;

  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map((entry) => firestoreValueToJs(entry));
  }

  if ("mapValue" in value) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value.mapValue.fields || {})) {
      out[key] = firestoreValueToJs(entry);
    }
    return out;
  }

  return undefined;
}

function toRawNewsRecord(document: FirestoreDocument): RawNewsRecord {
  const fields = document.fields || {};
  const id = document.name.split("/").pop() || "";

  const title = (firestoreValueToJs(fields.title) as string | undefined) || "";
  const content = (firestoreValueToJs(fields.content) as string | undefined) || "";
  const htmlContentUrl =
    (firestoreValueToJs(fields.htmlContentUrl) as string | undefined) || undefined;
  const thumbnailUrl =
    (firestoreValueToJs(fields.thumbnailUrl) as string | undefined) || undefined;
  const thumbnailPositionX =
    (firestoreValueToJs(fields.thumbnailPositionX) as number | undefined) ||
    undefined;
  const thumbnailPositionY =
    (firestoreValueToJs(fields.thumbnailPositionY) as number | undefined) ||
    undefined;
  const newsFeedThumbnailPositionX =
    (firestoreValueToJs(fields.newsFeedThumbnailPositionX) as
      | number
      | undefined) || undefined;
  const newsFeedThumbnailPositionY =
    (firestoreValueToJs(fields.newsFeedThumbnailPositionY) as
      | number
      | undefined) || undefined;
  const editorStateUrl =
    (firestoreValueToJs(fields.editorStateUrl) as string | undefined) || undefined;

  const tagsRaw = firestoreValueToJs(fields.tags);
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id,
    title,
    content,
    htmlContentUrl,
    createdAt: firestoreValueToJs(fields.createdAt),
    lastUpdated: firestoreValueToJs(fields.lastUpdated),
    thumbnailUrl,
    thumbnailPositionX,
    thumbnailPositionY,
    newsFeedThumbnailPositionX,
    newsFeedThumbnailPositionY,
    tags,
    editorStateUrl,
  };
}

function getProjectId(): string {
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  if (!projectId) {
    throw new Error("Missing Firebase project ID for SSR data fetch");
  }

  return projectId;
}

function getFirestoreApiKeyQueryParam(): string {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  return apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
}

async function getNewsItemsFromRest(): Promise<RawNewsRecord[]> {
  const projectId = getProjectId();
  const keyParam = getFirestoreApiKeyQueryParam();
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/news${keyParam}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Firestore REST list failed: ${response.status}`);
  }

  const payload = (await response.json()) as { documents?: FirestoreDocument[] };
  return (payload.documents || []).map(toRawNewsRecord);
}

async function getArticleByIdFromRest(
  id: string
): Promise<RawNewsRecord | undefined> {
  const projectId = getProjectId();
  const keyParam = getFirestoreApiKeyQueryParam();
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/news/${encodeURIComponent(id)}${keyParam}`;

  const response = await fetch(endpoint);
  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Firestore REST get failed: ${response.status}`);
  }

  const document = (await response.json()) as FirestoreDocument;
  return toRawNewsRecord(document);
}

async function fetchNews(tag?: string): Promise<SSRNewsItem[]> {
  const allItems = await getNewsItemsFromRest();

  const filtered = tag
    ? allItems.filter((item) => Array.isArray(item.tags) && item.tags.includes(tag))
    : allItems;

  const items = await Promise.all(
    filtered.map(async ({ tags: _tags, ...rest }) => {
      const item: SSRNewsItem = {
        ...rest,
        createdAt: parseCreatedAt(rest.createdAt),
        lastUpdated: parseCreatedAt(rest.lastUpdated),
      };

      if (item.htmlContentUrl) {
        try {
          const response = await fetch(item.htmlContentUrl);
          if (response.ok) {
            const htmlContent = await response.text();
            item.previewText = truncateWords(extractTextFromHtml(htmlContent), 40);
          }
        } catch (error) {
          console.warn("Failed to fetch news item HTML content for SSR", error);
        }
      }

      return item;
    })
  );

  return items.sort((a, b) => {
    const aTime = a.createdAt ?? 0;
    const bTime = b.createdAt ?? 0;
    return bTime - aTime;
  });
}

async function fetchArticleById(id: string): Promise<SSRArticle | undefined> {
  const sourceArticle = await getArticleByIdFromRest(id);
  if (!sourceArticle) {
    return undefined;
  }

  const article: SSRArticle = {
    id: sourceArticle.id,
    title: sourceArticle.title,
    tags: sourceArticle.tags || [],
    thumbnailUrl: sourceArticle.thumbnailUrl,
    thumbnailPositionX: sourceArticle.thumbnailPositionX,
    thumbnailPositionY: sourceArticle.thumbnailPositionY,
    newsFeedThumbnailPositionX: sourceArticle.newsFeedThumbnailPositionX,
    newsFeedThumbnailPositionY: sourceArticle.newsFeedThumbnailPositionY,
    editorStateUrl: sourceArticle.editorStateUrl,
    htmlContentUrl: sourceArticle.htmlContentUrl,
    content: sourceArticle.content || "",
  };

  if (article.htmlContentUrl) {
    try {
      const response = await fetch(article.htmlContentUrl);
      if (response.ok) {
        const htmlContent = await response.text();
        article.htmlContent = stripInlineBase64Images(htmlContent);
      }
    } catch (error) {
      console.warn("Failed to fetch article HTML content for SSR", error);
    }
  }

  return article;
}

export async function getInitialData(requestUrl: string): Promise<SSRData> {
  try {
    const parsedUrl = new URL(requestUrl, "http://localhost");
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === "/") {
      return {
        newsItems: await fetchNews(),
      };
    }

    const tagMatch = Object.values(HeaderTags).find((tag) => pathname === `/${tag}`);
    if (tagMatch) {
      return {
        tag: tagMatch,
        newsItems: await fetchNews(tagMatch),
      };
    }

    if (pathname.startsWith("/article/")) {
      const parts = pathname.split("/").filter(Boolean);
      const articleId = parts[1];
      if (articleId) {
        const article = await fetchArticleById(articleId);
        if (article) {
          return { article };
        }
      }
    }
  } catch (error) {
    console.warn("Failed to build SSR initial data", error);
  }

  return {};
}
