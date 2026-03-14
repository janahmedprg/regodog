// src/NewsFeed.tsx
import React, { Suspense, useEffect, useState } from "react";
import { auth, db, collection, getDocs } from "../config/firebase.js";
import { onAuthStateChanged, User } from "firebase/auth";
import NewsItem, { NewsItemProps } from "./NewsItem.js";
import "../styles/styles.css";
import "../styles/tags.css";
import { useSearchParams } from "react-router-dom";

const NEWS_ITEMS_PER_PAGE = 9;

function toEpochMillis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const numeric = Number.parseInt(value, 10);
    return Number.isFinite(numeric)
      ? numeric < 1_000_000_000_000
        ? numeric * 1000
        : numeric
      : 0;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === "object" && value !== null) {
    const timestampObject = value as Record<string, unknown>;
    const toDateValue = value as { toDate?: () => Date };
    const toMillisValue = value as { toMillis?: () => number };

    if (typeof toDateValue.toDate === "function") {
      const parsed = toDateValue.toDate().getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (typeof toMillisValue.toMillis === "function") {
      const parsed = toMillisValue.toMillis();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject.seconds === "number" &&
      Number.isFinite(timestampObject.seconds)
    ) {
      const seconds = timestampObject.seconds as number;
      const parsed = seconds < 1_000_000_000_000 ? seconds * 1000 : seconds;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject.seconds === "string" &&
      Number.isFinite(Number(timestampObject.seconds))
    ) {
      const numeric = Number(timestampObject.seconds);
      const parsed = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject.seconds === "number" &&
      typeof timestampObject.nanoseconds === "number" &&
      Number.isFinite(timestampObject.seconds)
    ) {
      const seconds = timestampObject.seconds;
      const nanoseconds = timestampObject.nanoseconds as number;
      const parsed =
        (seconds < 1_000_000_000_000 ? seconds * 1000 : seconds) +
        nanoseconds / 1_000_000;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject._seconds === "number" &&
      Number.isFinite(timestampObject._seconds)
    ) {
      const seconds = timestampObject._seconds as number;
      const parsed = seconds < 1_000_000_000_000 ? seconds * 1000 : seconds;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject._seconds === "string" &&
      Number.isFinite(Number(timestampObject._seconds))
    ) {
      const numeric = Number(timestampObject._seconds);
      const parsed = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject._seconds === "number" &&
      typeof timestampObject._nanoseconds === "number" &&
      Number.isFinite(timestampObject._seconds)
    ) {
      const seconds = timestampObject._seconds;
      const nanoseconds = timestampObject._nanoseconds as number;
      const parsed =
        (seconds < 1_000_000_000_000 ? seconds * 1000 : seconds) +
        nanoseconds / 1_000_000;
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestampObject._seconds === "string" &&
      typeof timestampObject._nanoseconds === "number" &&
      Number.isFinite(Number(timestampObject._seconds))
    ) {
      const numeric = Number(timestampObject._seconds);
      const nanoseconds = timestampObject._nanoseconds as number;
      const parsed =
        (numeric < 1_000_000_000_000 ? numeric * 1000 : numeric) +
        nanoseconds / 1_000_000;
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const fallback = new Date(value as never).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
}

function getLatestTimestamp(item: {
  createdAt?: NewsItemData["createdAt"];
}): number {
  return toEpochMillis(item.createdAt);
}

function parsePageFromSearchParams(searchParams: URLSearchParams): number {
  const raw = searchParams.get("page");
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 1
    ? 1
    : parsed;
}

interface NewsFeedProps {
  tag?: string;
  initialNewsItems?: NewsItemData[];
}

interface NewsItemData extends Omit<NewsItemProps, "link"> {
  id: string;
  lastUpdated?: unknown;
}

const EditorApp = React.lazy(() => import("../editor/App.js"));

const NewsFeed: React.FC<NewsFeedProps> = ({ tag, initialNewsItems }) => {
  const isBrowser = typeof window !== "undefined";
  const [newsItems, setNewsItems] = useState<NewsItemData[]>(
    initialNewsItems ?? [],
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const currentPage = parsePageFromSearchParams(searchParams);

  // Fetch news items
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "news"));
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NewsItemData[];
        // Filter items by tag if a tag is provided
        const filteredItems = tag
          ? items.filter((item) => item.tags && item.tags.includes(tag))
          : items;
        setNewsItems((previousItems) => {
          const previousPreviewById = new Map(
            previousItems.map((item) => [item.id, item.previewText] as const),
          );

          return filteredItems.map((item) => ({
            ...item,
            previewText: item.previewText || previousPreviewById.get(item.id),
          }));
        });
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };

    fetchNews();
  }, [tag]);

  const sortedItems = React.useMemo(() => {
    return [...newsItems].sort((a, b) => {
      const aTime = getLatestTimestamp(a);
      const bTime = getLatestTimestamp(b);
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      const aCreated = toEpochMillis(a.createdAt);
      const bCreated = toEpochMillis(b.createdAt);
      if (aCreated !== bCreated) {
        return bCreated - aCreated;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  }, [newsItems]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / NEWS_ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * NEWS_ITEMS_PER_PAGE;
  const paginatedItems = sortedItems.slice(
    startIndex,
    startIndex + NEWS_ITEMS_PER_PAGE,
  );

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | "..."> = [1];
    const windowStart = Math.max(2, safeCurrentPage - 1);
    const windowEnd = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (windowStart > 2) {
      pages.push("...");
    } else {
      for (let page = 2; page < windowStart; page += 1) {
        pages.push(page);
      }
    }

    for (let page = windowStart; page <= windowEnd; page += 1) {
      pages.push(page);
    }

    if (windowEnd < totalPages - 1) {
      pages.push("...");
    } else {
      for (let page = windowEnd + 1; page < totalPages; page += 1) {
        pages.push(page);
      }
    }

    pages.push(totalPages);
    return pages;
  }, [safeCurrentPage, totalPages]);

  // Check if the user is an admin
  useEffect(() => {
    if (!auth) {
      return;
    }

    const checkIfAdmin = async (userId: string) => {
      try {
        const querySnapshot = await getDocs(collection(db, "check-admin"));
        const isAdmin = querySnapshot.docs.some(
          (doc) => doc.data().id === userId,
        );
        return isAdmin;
      } catch {
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const adminStatus = await checkIfAdmin(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="news-feed">
      <h2 className="news-header">
        {tag ? tag.toUpperCase().replace(/_/g, " ") : "FEATURED"}
      </h2>

      {isAdmin && (
        <div className="create-article-section">
          {!isCreating ? (
            <button className="edit-button" onClick={() => setIsCreating(true)}>
              Create New Article
            </button>
          ) : (
            <div className="create-article-form">
              {isBrowser && (
                <Suspense
                  fallback={<div className="loading">Loading editor...</div>}
                >
                  <EditorApp />
                </Suspense>
              )}
              <button
                className="edit-button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle("");
                  setSelectedTags([]);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="news-items">
        {paginatedItems.map((item) => (
          <NewsItem
            key={item.id}
            title={item.title}
            content={item.content}
            htmlContentUrl={item.htmlContentUrl}
            previewText={item.previewText}
            link={item.id}
            createdAt={item.createdAt}
            thumbnailUrl={item.thumbnailUrl}
            thumbnailPositionX={item.thumbnailPositionX}
            thumbnailPositionY={item.thumbnailPositionY}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="news-pagination">
          <button
            type="button"
            className="news-page-button news-page-arrow"
            onClick={() => {
              const nextPage = Math.max(1, safeCurrentPage - 1);
              setSearchParams({ page: String(nextPage) });
            }}
            disabled={safeCurrentPage <= 1}
            aria-label="Previous page"
          >
            Previous
          </button>

          <div className="news-page-numbers">
            {pageNumbers.map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-${index}`} className="news-page-ellipsis">
                    …
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  key={page}
                  className={`news-page-number ${
                    page === safeCurrentPage ? "news-page-number--active" : ""
                  }`}
                  onClick={() => setSearchParams({ page: String(page) })}
                  disabled={page === safeCurrentPage}
                  aria-current={page === safeCurrentPage ? "page" : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="news-page-button news-page-arrow"
            onClick={() => {
              const nextPage = Math.min(totalPages, safeCurrentPage + 1);
              setSearchParams({ page: String(nextPage) });
            }}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
