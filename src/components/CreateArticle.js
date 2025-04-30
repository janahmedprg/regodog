import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, addDoc, auth } from "../config/firebase";
import Editor from "./Editor";
import { $generateHtmlFromNodes } from "@lexical/html";
import "../styles/styles.css";
import "../styles/tags.css";

const CreateArticle = () => {
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const navigate = useNavigate();

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

  const handleSubmit = async (editorState) => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setError(null);

    try {
      // Get HTML content from editor state
      let htmlContent = "";
      const serializedState = JSON.stringify(editorState.toJSON());

      editorState.read(() => {
        const root = editorState._nodeMap.get("root");
        if (root) {
          htmlContent = $generateHtmlFromNodes(editorState);
        }
      });

      // Create new article in Firebase
      const docRef = await addDoc(collection(db, "news"), {
        title: title,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        createdAt: new Date(),
        lastUpdated: new Date(),
        author: auth.currentUser?.uid || "anonymous",
      });

      // Navigate to the new article
      navigate(`/article/${docRef.id}`);
    } catch (error) {
      console.error("Error creating article:", error);
      setError("Failed to create article. Please try again.");
    }
  };

  return (
    <div className="create-article-container">
      <h1>Create New Article</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="article-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article Title"
          className="article-title-input"
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
        <Editor onSave={handleSubmit} />
      </div>
    </div>
  );
};

export default CreateArticle;
