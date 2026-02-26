// src/NewsFeed.tsx
import React, { Suspense, useEffect, useState } from "react";
import { auth, db, collection, getDocs } from "../config/firebase.js";
import { onAuthStateChanged, User } from "firebase/auth";
import NewsItem, { NewsItemProps } from "./NewsItem.js";
import "../styles/styles.css";
import "../styles/tags.css";

interface NewsFeedProps {
  tag?: string;
  initialNewsItems?: NewsItemData[];
}

interface NewsItemData extends Omit<NewsItemProps, "link"> {
  id: string;
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
        {newsItems.map((item) => (
          <NewsItem
            key={item.id}
            title={item.title}
            content={item.content}
            htmlContentUrl={item.htmlContentUrl}
            previewText={item.previewText}
            link={item.id}
            createdAt={item.createdAt}
            thumbnailUrl={item.thumbnailUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
