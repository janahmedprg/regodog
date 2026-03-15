// src/NewsFeed.tsx
import React, { Suspense, useEffect, useState } from "react";
import { auth, db, collection, getDocs } from "../config/firebase.js";
import { onAuthStateChanged, User } from "firebase/auth";
import NewsItem, { NewsItemProps } from "./NewsItem.js";
import "../styles/styles.css";
import "../styles/tags.css";
import { Link, useSearchParams } from "react-router-dom";

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
  pinned?: boolean;
  pinnedOrder?: number;
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
  const pinnedStripRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollPinnedLeft, setCanScrollPinnedLeft] =
    useState<boolean>(false);
  const [canScrollPinnedRight, setCanScrollPinnedRight] =
    useState<boolean>(false);

  const currentPage = parsePageFromSearchParams(searchParams);
  const isHome = !tag;
  const shouldPaginate = Boolean(tag);

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

  const pinnedItems = React.useMemo(
    () =>
      sortedItems
        .filter((item) => item.pinned)
        .sort((a, b) => {
          const aOrder =
            typeof a.pinnedOrder === "number"
              ? a.pinnedOrder
              : Number.MAX_SAFE_INTEGER;
          const bOrder =
            typeof b.pinnedOrder === "number"
              ? b.pinnedOrder
              : Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          const aTime = toEpochMillis(a.createdAt);
          const bTime = toEpochMillis(b.createdAt);
          return bTime - aTime;
        }),
    [sortedItems],
  );

  const totalPages = shouldPaginate
    ? Math.max(1, Math.ceil(sortedItems.length / NEWS_ITEMS_PER_PAGE))
    : 1;
  const safeCurrentPage = shouldPaginate
    ? Math.min(currentPage, totalPages)
    : 1;
  const startIndex = (safeCurrentPage - 1) * NEWS_ITEMS_PER_PAGE;
  const paginatedItems = shouldPaginate
    ? sortedItems.slice(startIndex, startIndex + NEWS_ITEMS_PER_PAGE)
    : [];

  const updatePinnedScrollState = React.useCallback(() => {
    const strip = pinnedStripRef.current;
    if (!strip) {
      setCanScrollPinnedLeft(false);
      setCanScrollPinnedRight(false);
      return;
    }

    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    setCanScrollPinnedLeft(strip.scrollLeft > 2);
    setCanScrollPinnedRight(strip.scrollLeft < maxScrollLeft - 2);
  }, []);

  const scrollPinnedStrip = React.useCallback(
    (direction: "left" | "right") => {
      const strip = pinnedStripRef.current;
      if (!strip) {
        return;
      }
      const step = Math.max(300, Math.floor(strip.clientWidth * 0.85));
      strip.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
      window.setTimeout(updatePinnedScrollState, 180);
    },
    [updatePinnedScrollState],
  );

  const pageNumbers = React.useMemo(() => {
    if (!shouldPaginate) {
      return [];
    }

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

  useEffect(() => {
    const strip = pinnedStripRef.current;
    if (!strip) {
      return;
    }

    const onScroll = () => {
      updatePinnedScrollState();
    };

    strip.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      strip.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pinnedItems.length, updatePinnedScrollState]);

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
        {tag
          ? tag.toUpperCase().replace(/_/g, " ")
          : "WELCOME TO A small corner for stories, traditions, and everyday inspiration"}
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

      {!isHome && (
        <>
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
                thumbnailAltText={item.thumbnailAltText}
                newsFeedThumbnailPositionX={
                  item.newsFeedThumbnailPositionX ?? item.thumbnailPositionX
                }
                newsFeedThumbnailPositionY={
                  item.newsFeedThumbnailPositionY ?? item.thumbnailPositionY
                }
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
                      <span
                        key={`ellipsis-${index}`}
                        className="news-page-ellipsis"
                      >
                        …
                      </span>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={page}
                      className={`news-page-number ${
                        page === safeCurrentPage
                          ? "news-page-number--active"
                          : ""
                      }`}
                      onClick={() => setSearchParams({ page: String(page) })}
                      disabled={page === safeCurrentPage}
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
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
        </>
      )}

      {isHome && (
        <section className="home-intro">
          <div className="home-intro-layout">
            <div className="home-intro-copy">
              <h2 className="home-title">The Story Behind Regodog</h2>
              <p className="home-description">
                Regodog started after we moved to Middle Village, near Rego Park
                in Queens, New York, with our two black Standard Schnauzers. The
                name simply comes from the neighborhood that became part of our
                everyday life - and of course from our dogs. The idea behind
                this site is simple: to share stories, traditions, experiences,
                and things learned along the way. Some come from our Czech
                roots, others from everyday life, small discoveries, and moments
                that feel worth passing on. Regodog is simply a place to collect
                those stories and share them with anyone who might enjoy them
                too.
              </p>
              <p className="home-description">
                If something here inspires you, teaches you something new, or
                simply makes you smile, then it has done its job.
              </p>
            </div>
            <aside className="home-intro-side">
              <h3 className="home-side-title">Explore</h3>
              <div className="home-action-row home-side-actions">
                <Link to="/bakery" className="home-link">
                  Bakery
                </Link>
                <Link to="/standard_schnauzer" className="home-link">
                  Standard Schnauzer
                </Link>
                <Link to="/farmhouse" className="home-link">
                  Farmhouse
                </Link>
                <Link to="/rego_project" className="home-link">
                  Rego Project
                </Link>
              </div>
            </aside>
          </div>
        </section>
      )}

      {isHome && (
        <section className="home-pinned-section">
          <div className="home-pinned-strip-shell">
            <button
              type="button"
              className="home-pinned-arrow home-pinned-arrow--left"
              aria-label="Scroll pinned posts left"
              onClick={() => scrollPinnedStrip("left")}
              disabled={!canScrollPinnedLeft}
            >
              ‹
            </button>
            <div className="home-pinned-strip" ref={pinnedStripRef}>
              {pinnedItems.length === 0 && (
                <p className="home-pinned-empty">
                  No pinned posts yet. Pin your favorites from the editor when
                  you publish them.
                </p>
              )}
              {pinnedItems.map((item) => (
                <article key={item.id} className="home-pinned-card">
                  <NewsItem
                    title={item.title}
                    content={item.content}
                    htmlContentUrl={item.htmlContentUrl}
                    previewText={item.previewText}
                    link={item.id}
                    createdAt={item.createdAt}
                    thumbnailUrl={item.thumbnailUrl}
                    thumbnailAltText={item.thumbnailAltText}
                    newsFeedThumbnailPositionX={
                      item.newsFeedThumbnailPositionX ?? item.thumbnailPositionX
                    }
                    newsFeedThumbnailPositionY={
                      item.newsFeedThumbnailPositionY ?? item.thumbnailPositionY
                    }
                    thumbnailPositionX={item.thumbnailPositionX}
                    thumbnailPositionY={item.thumbnailPositionY}
                  />
                </article>
              ))}
            </div>
            <button
              type="button"
              className="home-pinned-arrow home-pinned-arrow--right"
              aria-label="Scroll pinned posts right"
              onClick={() => scrollPinnedStrip("right")}
              disabled={!canScrollPinnedRight}
            >
              ›
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default NewsFeed;
