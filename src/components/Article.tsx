import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  db,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  auth,
  collection,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
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
  editorState?: string;
  htmlContent?: string;
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

  // Fetch article
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
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      }

      setLoading(false);
    };

    fetchArticle();
  }, [id]);

  // Check admin status
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

  // Note: handleSave is available for future use. Users can also use the save button from ActionsPlugin.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSave = async (editorState: string, htmlContent: string) => {
    if (!id) return;
    if (!editorState) return console.error("Missing editor state");

    try {
      const updateData: Partial<ArticleData> & { lastUpdated: Date } = {
        title: editedTitle,
        editorState,
        htmlContent,
        tags: selectedTags,
        lastUpdated: new Date(),
      };

      // Upload image if selected
      if (selectedImage) {
        const imageRef = ref(
          storage,
          `thumbnails/${Date.now()}_${selectedImage.name}`
        );
        const snapshot = await uploadBytes(imageRef, selectedImage);
        const url = await getDownloadURL(snapshot.ref);

        updateData.thumbnailUrl = url;
      }

      const docRef = doc(db, "news", id);
      await updateDoc(docRef, updateData);

      setArticle((prev) =>
        prev
          ? {
              ...prev,
              ...updateData,
            }
          : null
      );

      setIsEditing(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

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

  if (loading) return <div className="loading">Loading...</div>;
  if (!article) return <div className="error">Article not found</div>;

  return (
    <div className="article-container">
      {isEditing ? (
        <div className="edit-mode">
          <App
            initialEditorState={article.editorState}
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
            {article.htmlContent ? (
              <div
                className="article-html-content"
                dangerouslySetInnerHTML={{ __html: article.htmlContent }}
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
