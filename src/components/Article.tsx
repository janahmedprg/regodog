import React, { useEffect, useState } from "react";
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

import App from "../editor/App";

interface ArticleData {
  title: string;
  tags?: string[];
  thumbnailUrl?: string;
  editorStateUrl?: string;
  htmlContentUrl?: string;
  content?: string;
}

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [editedTitle, setEditedTitle] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // NEW: fetched HTML content
  const [htmlContent, setHtmlContent] = useState<string>("");

  // NEW: fetched editorState JSON
  const [fetchedEditorState, setFetchedEditorState] = useState<string | null>(
    null
  );

  // --------------------------
  // Fetch article + file URLs
  // --------------------------
  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ArticleData;
          setArticle(data);
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
  }, [id]);

  // --------------------------
  // Verify admin status
  // --------------------------
  useEffect(() => {
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

      if (data?.thumbnailUrl) {
        try {
          const imgRef = ref(storage, data.thumbnailUrl);
          await deleteObject(imgRef);
        } catch (err) {
          console.warn("Error deleting image:", err);
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

  // Wait for HTML file
  if (article.htmlContentUrl && !htmlContent) {
    return <div className="loading">Loading article...</div>;
  }

  // Wait for editorState JSON file
  if (article.editorStateUrl && !fetchedEditorState) {
    return <div className="loading">Loading editor data...</div>;
  }

  // --------------------------
  // MAIN RENDER
  // --------------------------
  return (
    <div className="article-container">
      {isEditing ? (
        <div className="edit-mode">
          <App
            initialEditorState={
              fetchedEditorState || article.editorStateUrl || ""
            }
            articleId={id}
            articleTitle={editedTitle}
            articleTags={selectedTags}
            articleThumbnailUrl={imagePreview || article.thumbnailUrl}
            onBeforeNavigate={() => setIsEditing(false)}
          />

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
