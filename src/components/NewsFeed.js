// src/NewsFeed.js
import React, { useEffect, useState } from "react";
import {
  auth,
  db,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "../config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import Editor from "./Editor";
import "../styles/styles.css";
import "../styles/tags.css";
// import Ad from "./Ad";

const NewsItem = ({
  title,
  content,
  htmlContent,
  editorState,
  tags,
  link,
  button,
  isAdmin,
  onEdit,
  onRemove,
  id,
  createdAt,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [selectedTags, setSelectedTags] = useState(tags || []);

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

  const truncateText = (text, wordLimit) => {
    if (!text) return "";
    const words = text.split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  const truncateHtmlContent = (html) => {
    if (!html) return "";
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText;
    return truncateText(text, 20);
  };

  // Function to handle "Read the Article" button click
  const handleReadArticle = () => {
    navigate(`/article/${link}`);
  };

  // Function to handle "Edit" button click
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Function to handle "Save" button click
  const handleSave = (editorState, htmlContent) => {
    onEdit(id, editedTitle, editorState, htmlContent, selectedTags);
    setIsEditing(false);
  };

  // Function to handle "Cancel" button click
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(title);
    setSelectedTags(tags || []);
  };

  // Function to handle "Remove" button click
  const handleRemove = () => {
    onRemove(id);
  };

  // Format the date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="news-item">
      {isEditing ? (
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
          <Editor initialEditorState={editorState} onSave={handleSave} />
          <div className="edit-buttons">
            <button onClick={handleCancel} className="edit-cancel-button">
              Discard Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="news-title">{title}</p>
          <p className="news-date">{formatDate(createdAt)}</p>
          <div className="article-tags">
            {tags &&
              tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
          </div>
          <div className="news-content">
            {htmlContent ? (
              <div>{truncateHtmlContent(htmlContent)}</div>
            ) : (
              <p>{truncateText(content, 20)}</p>
            )}
          </div>
          {button && (
            <button className="news-button" onClick={handleReadArticle}>
              {button}
            </button>
          )}
          {isAdmin && (
            <div className="admin-buttons">
              <button className="edit-button" onClick={handleEdit}>
                Edit
              </button>
              <button className="remove-button" onClick={handleRemove}>
                Remove
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const NewsFeed = ({ tag }) => {
  const [newsItems, setNewsItems] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
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

  // Fetch news items
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "news"));
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Filter items by tag if a tag is provided
        const filteredItems = tag
          ? items.filter((item) => item.tags && item.tags.includes(tag))
          : items;
        setNewsItems(filteredItems);
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };

    fetchNews();
  }, [tag]);

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
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle form submission to post new news
  const handlePostNews = async (editorState, htmlContent) => {
    if (!newTitle.trim()) {
      alert("Please enter a title");
      return;
    }

    try {
      const serializedState = editorState;

      // Create new article in Firebase
      const docRef = await addDoc(collection(db, "news"), {
        title: newTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      // Reset form and navigate to the new article
      setNewTitle("");
      setSelectedTags([]);
      setIsCreating(false);
      navigate(`/article/${docRef.id}`);
    } catch (error) {
      console.error("Error creating article:", error);
      alert("Failed to create article. Please try again.");
    }
  };

  // Handle edit button click
  const handleEdit = async (
    id,
    newTitle,
    editorState,
    htmlContent,
    newTags
  ) => {
    try {
      const newsDocRef = doc(db, "news", id);
      const serializedState = editorState;
      await updateDoc(newsDocRef, {
        title: newTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: newTags,
        lastUpdated: new Date(),
      });
      console.log("News item updated successfully!");

      // Update the local state to reflect the changes
      setNewsItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? {
                ...item,
                title: newTitle,
                editorState: serializedState,
                htmlContent: htmlContent,
                tags: newTags,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating news item: ", error);
    }
  };

  const handleRemove = async (id) => {
    try {
      const newsDocRef = doc(db, "news", id);
      await deleteDoc(newsDocRef);
      console.log("News item removed successfully!");

      // Update the local state to remove the deleted item
      setNewsItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing news item: ", error);
    }
  };

  return (
    <div className="news-feed">
      <h2 className="news-header">
        {tag ? tag.toUpperCase().replace(/_/g, " ") : "NEWS FEED"}
      </h2>

      {isAdmin && (
        <div className="create-article-section">
          {!isCreating ? (
            <button
              className="create-article-button"
              onClick={() => setIsCreating(true)}
            >
              Create New Article
            </button>
          ) : (
            <div className="create-article-form">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
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
              <Editor onSave={handlePostNews} />
              <button
                className="cancel-button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle("");
                  setSelectedTags([]);
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
            id={item.id}
            title={item.title}
            content={item.content}
            htmlContent={item.htmlContent}
            editorState={item.editorState}
            tags={item.tags}
            link={item.id}
            button="Read the Article"
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onRemove={handleRemove}
            createdAt={item.createdAt}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
