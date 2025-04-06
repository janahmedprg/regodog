import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  db,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  auth,
  collection,
} from "../config/firebase"; // Import Firestore utilities
import { onAuthStateChanged } from "firebase/auth";
import "../styles/styles.css"; // Import CSS for styling
import Editor from "./Editor";

const Article = () => {
  const { id } = useParams(); // Get article ID from URL
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // State to check if the user is an admin
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  const [editedTitle, setEditedTitle] = useState(""); // State for edited title
  const [editedContent, setEditedContent] = useState(""); // State for edited content
  const [editorContent, setEditorContent] = useState(null);

  // Fetch article data
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle(docSnap.data());
          setEditedTitle(docSnap.data().title); // Initialize edited title
          setEditedContent(docSnap.data().content); // Initialize edited content
          setEditorContent(docSnap.data().content);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      }
      setLoading(false);
    };

    fetchArticle();
  }, [id]);

  // Check if the user is an admin
  useEffect(() => {
    const checkIfAdmin = async (userId) => {
      try {
        const querySnapshot = await getDocs(collection(db, "check-admin"));
        const isAdmin = querySnapshot.docs.some(
          (doc) => doc.data().id === userId
        );
        return isAdmin;
      } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdmin = await checkIfAdmin(user.uid);
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false); // User is not logged in
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true); // Enable edit mode
  };

  // Handle save button click
  const handleSave = async () => {
    try {
      const docRef = doc(db, "news", id);
      await updateDoc(docRef, {
        title: editedTitle,
        content: editedContent,
      });
      setArticle({ ...article, title: editedTitle, content: editedContent }); // Update local state
      setIsEditing(false); // Disable edit mode
      console.log("Article updated successfully!");
    } catch (error) {
      console.error("Error updating article:", error);
    }
  };

  const handleEditorSave = async (editorState, docId, collectionName) => {
    try {
      const docRef = doc(db, collectionName, docId);

      await updateDoc(docRef, {
        title: editedTitle,
        editorContent: editorState, // Save the structured editor content
        content: JSON.stringify(editorState), // Optional: keep plain text version
        lastUpdated: new Date(),
      });

      setArticle((prev) => ({
        ...prev,
        title: editedTitle,
        editorContent: editorState,
      }));
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    setIsEditing(false); // Disable edit mode
    setEditedTitle(article.title); // Reset edited title
    setEditedContent(article.content); // Reset edited content
  };

  if (loading) {
    return <div className="loading">Loading article...</div>;
  }

  if (!article) {
    return <div className="error">Article not found</div>;
  }

  return (
    <div className="article-container">
      {isEditing ? (
        // Edit mode
        <div className="edit-mode">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="edit-input"
            placeholder="Article Title"
          />
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="edit-textarea"
            placeholder="Write your article content here..."
          />
          <div className="edit-buttons">
            <button onClick={handleSave} className="edit-save-button">
              Save Changes
            </button>
            <button onClick={handleCancel} className="edit-cancel-button">
              Discard Changes
            </button>
          </div>
          {/* <Editor
            initialEditorState={editorContent}
            onSave={(content) => handleEditorSave(content, id, "news")}
          /> */}
        </div>
      ) : (
        // View mode
        <>
          <h1 className="article-title">{article.title}</h1>
          <p className="article-content">{article.content}</p>
          {isAdmin && (
            <button onClick={handleEdit} className="edit-button">
              Edit Article
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Article;
