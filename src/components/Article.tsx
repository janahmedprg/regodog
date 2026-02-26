import React, { Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  db,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  auth,
  collection,
  storage,
  ref,
  deleteObject,
} from "../config/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

import "../styles/styles.css";
import "../styles/tags.css";

const EditorApp = React.lazy(() => import("../editor/App"));

interface ArticleData {
  id?: string;
  title: string;
  tags?: string[];
  thumbnailUrl?: string;
  editorStateUrl?: string;
  htmlContentUrl?: string;
  content?: string;
  htmlContent?: string;
}

interface ArticleProps {
  initialArticle?: ArticleData;
}

const Article: React.FC<ArticleProps> = ({ initialArticle }) => {
  const isBrowser = typeof window !== "undefined";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isSeededArticle = Boolean(initialArticle && initialArticle.id === id);
  const seededHtmlFromDom =
    isBrowser && isSeededArticle && !initialArticle?.htmlContent
      ? document.querySelector(".article-html-content")?.innerHTML || ""
      : "";

  const [article, setArticle] = useState<ArticleData | null>(
    isSeededArticle ? initialArticle || null : null
  );
  const [loading, setLoading] = useState<boolean>(!isSeededArticle);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [editedTitle, setEditedTitle] = useState<string>(
    isSeededArticle ? initialArticle?.title || "" : ""
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isSeededArticle ? initialArticle?.tags || [] : []
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    isSeededArticle ? initialArticle?.thumbnailUrl || null : null
  );

  // NEW: fetched HTML content
  const [htmlContent, setHtmlContent] = useState<string>(
    isSeededArticle ? initialArticle?.htmlContent || seededHtmlFromDom : ""
  );

  // NEW: fetched editorState JSON
  const [fetchedEditorState, setFetchedEditorState] = useState<string | null>(
    null
  );

  // --------------------------
  // Fetch article + file URLs
  // --------------------------
  useEffect(() => {
    if (
      isSeededArticle &&
      (!initialArticle?.htmlContentUrl || Boolean(initialArticle.htmlContent))
    ) {
      return;
    }

    const fetchArticle = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ArticleData;
          setArticle({ ...data, id: docSnap.id });
          setEditedTitle(data.title);
          setSelectedTags(data.tags || []);
          setImagePreview(data.thumbnailUrl || null);

          // Fetch HTML content if URL exists
          if (data.htmlContentUrl) {
            try {
              const response = await fetch(data.htmlContentUrl);
              const html = await response.text();
              setHtmlContent(html);
            } catch (err) {
              console.error("Error fetching HTML:", err);
            }
          }

          // Fetch editorState JSON if URL exists
          if (data.editorStateUrl) {
            try {
              const response = await fetch(data.editorStateUrl);
              const json = await response.text();
              setFetchedEditorState(json);
            } catch (err) {
              console.error("Error fetching editor state JSON:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      }

      setLoading(false);
    };

    fetchArticle();
  }, [id, isSeededArticle, initialArticle]);

  // --------------------------
  // Verify admin status
  // --------------------------
  useEffect(() => {
    if (!auth) {
      return;
    }

    const checkIfAdmin = async (userId: string) => {
      try {
        const snapshot = await getDocs(collection(db, "check-admin"));
        return snapshot.docs.some((d) => d.data().id === userId);
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

  const handleCancel = () => {
    if (!article) return;
    setIsEditing(false);
    setEditedTitle(article.title);
    setSelectedTags(article.tags || []);
    setSelectedImage(null);
    setImagePreview(article.thumbnailUrl || null);
  };

  const handleRemove = async () => {
    if (!id) return;

    const confirmDelete = window.confirm("Delete this article?");
    if (!confirmDelete) return;

    try {
      const docRef = doc(db, "news", id);
      const snap = await getDoc(docRef);
      const data = snap.data() as ArticleData;

      // Delete thumbnail image if it exists
      if (data?.thumbnailUrl) {
        try {
          // Extract path from Firebase Storage download URL
          const urlObj = new URL(data.thumbnailUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const imgRef = ref(storage, decodedPath);
            await deleteObject(imgRef);
          }
        } catch (err) {
          console.warn("Error deleting thumbnail image:", err);
        }
      }

      // Delete editor state file if it exists
      if (data?.editorStateUrl) {
        try {
          // Extract path from Firebase Storage download URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2FTO%2FFILE?alt=media&token=...
          const urlObj = new URL(data.editorStateUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const editorStateRef = ref(storage, decodedPath);
            await deleteObject(editorStateRef);
          }
        } catch (err) {
          console.warn("Error deleting editor state file:", err);
        }
      }

      // Delete HTML content file if it exists
      if (data?.htmlContentUrl) {
        try {
          // Extract path from Firebase Storage download URL
          const urlObj = new URL(data.htmlContentUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const htmlRef = ref(storage, decodedPath);
            await deleteObject(htmlRef);
          }
        } catch (err) {
          console.warn("Error deleting HTML content file:", err);
        }
      }

      await deleteDoc(docRef);
      navigate("/");
    } catch (error) {
      console.error("Error removing article:", error);
    }
  };

  // --------------------------
  // LOADING STATES
  // --------------------------
  if (loading) return <div className="loading">Loading...</div>;
  if (!article) return <div className="error">Article not found</div>;

  // Only block rendering when there is no server/client HTML and no plain text fallback.
  if (article.htmlContentUrl && !htmlContent && !article.content) {
    return <div className="loading">Loading article...</div>;
  }

  // Editor state is only needed when entering edit mode.
  if (isEditing && article.editorStateUrl && !fetchedEditorState) {
    return <div className="loading">Loading editor data...</div>;
  }

  // --------------------------
  // MAIN RENDER
  // --------------------------
  return (
    <div className="article-container">
      {isEditing ? (
        <div className="edit-mode">
          {isBrowser && (
            <Suspense fallback={<div className="loading">Loading editor...</div>}>
              <EditorApp
                initialEditorState={
                  fetchedEditorState || article.editorStateUrl || ""
                }
                articleId={id}
                articleTitle={editedTitle}
                articleTags={selectedTags}
                articleThumbnailUrl={imagePreview || article.thumbnailUrl}
                onBeforeNavigate={() => setIsEditing(false)}
              />
            </Suspense>
          )}

          <div className="edit-buttons">
            <button onClick={handleCancel} className="edit-button">
              Discard
            </button>
          </div>
        </div>
      ) : (
        <>
          {article.thumbnailUrl && (
            <div className="article-thumbnail">
              <img src={article.thumbnailUrl} alt="Thumbnail" />
            </div>
          )}

          <h1>{article.title}</h1>

          <div className="article-tags">
            {article.tags?.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="article-content">
            {htmlContent ? (
              <div
                className="article-html-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <p>{article.content}</p>
            )}
          </div>

          {isAdmin && (
            <div className="admin-buttons">
              <button
                onClick={() => setIsEditing(true)}
                className="edit-button"
              >
                Edit
              </button>

              <button onClick={handleRemove} className="remove-button">
                Remove
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Article;
