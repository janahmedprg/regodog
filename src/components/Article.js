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
import "../styles/tags.css";
import Editor from "./Editor";
// import { createEditor, $getRoot } from "lexical";
// import { $createParagraphNode, $createTextNode } from "lexical";

const Article = () => {
  // Create a default editor state with a paragraph node
  // const createDefaultEditorState = () => {
  //   const editor = createEditor();
  //   let editorState = null;
  //   editor.update(() => {
  //     const root = $getRoot();
  //     const paragraph = $createParagraphNode();
  //     const text = $createTextNode("Start writing your article...");
  //     paragraph.append(text);
  //     root.append(paragraph);
  //     editorState = editor.getEditorState();
  //   });
  //   return editorState;
  // };

  const { id } = useParams(); // Get article ID from URL
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // State to check if the user is an admin
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  const [editedTitle, setEditedTitle] = useState(""); // State for edited title
  const [selectedTags, setSelectedTags] = useState([]);

  const availableTags = [
    "bakery",
    "standard_schnouzer",
    "farm_house",
    "anything",
  ];

  const handleTagChange = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Fetch article data
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticle(data);
          setEditedTitle(data.title);
          setSelectedTags(data.tags || []);
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
    setIsEditing(true);
  };

  // Handle save button click
  const handleSave = async (editorState, htmlContent) => {
    if (!editorState) {
      console.error("No editor state to save");
      return;
    }

    try {
      // The editorState is already serialized as a JSON string from the Editor component
      const serializedState = editorState;

      // Update Firebase
      const docRef = doc(db, "news", id);
      await updateDoc(docRef, {
        title: editedTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        lastUpdated: new Date(),
      });

      // Update local state
      setArticle((prev) => ({
        ...prev,
        title: editedTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
      }));

      setIsEditing(false);
      console.log("Article updated successfully!");
    } catch (error) {
      console.error("Error updating article:", error);
      alert("Failed to save article. Please try again.");
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(article.title);
    setSelectedTags(article.tags || []);
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
          <div className="tags-section">
            <h3>Select Tags:</h3>
            <div className="tags-container">
              {availableTags.map((tag) => (
                <label key={tag} className="tag-label">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagChange(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
          <Editor
            initialEditorState={article.editorState}
            onSave={handleSave}
          />
          <div className="edit-buttons">
            <button onClick={handleCancel} className="edit-cancel-button">
              Discard Changes
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-tags">
            {article.tags &&
              article.tags.map((tag) => (
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
                style={{ maxWidth: "100%", overflow: "hidden" }}
              />
            ) : (
              <p>{article.content}</p>
            )}
          </div>
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
