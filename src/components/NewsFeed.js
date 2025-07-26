// src/NewsFeed.js
import React, { useEffect, useState } from "react";
import {
  auth,
  db,
  collection,
  getDocs,
  addDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "../config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import Editor from "./Editor";
import NewsItem from "./NewsItem";
import "../styles/styles.css";
import "../styles/tags.css";
// import Ad from "./Ad";

const NewsFeed = ({ tag }) => {
  const [newsItems, setNewsItems] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();

  const availableTags = [
    "bakery",
    "standard_schnauzer",
    "farm_house",
    "anything",
  ];

  const handleTagChange = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
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
      let thumbnailUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const imageRef = ref(
          storage,
          `thumbnails/${Date.now()}_${selectedImage.name}`
        );
        const snapshot = await uploadBytes(imageRef, selectedImage);
        thumbnailUrl = await getDownloadURL(snapshot.ref);
      }

      // Create new article in Firebase
      const docRef = await addDoc(collection(db, "news"), {
        title: newTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        thumbnailUrl: thumbnailUrl,
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      // Reset form and navigate to the new article
      setNewTitle("");
      setSelectedTags([]);
      setSelectedImage(null);
      setImagePreview(null);
      setIsCreating(false);
      navigate(`/article/${docRef.id}`);
    } catch (error) {
      console.error("Error creating article:", error);
      alert("Failed to create article. Please try again.");
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
              <div className="image-upload-section">
                <h3>Thumbnail Image:</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="image-input"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Thumbnail preview" />
                  </div>
                )}
              </div>
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
            id={item.id}
            title={item.title}
            content={item.content}
            htmlContent={item.htmlContent}
            editorState={item.editorState}
            tags={item.tags}
            link={item.id}
            isAdmin={isAdmin}
            createdAt={item.createdAt}
            thumbnailUrl={item.thumbnailUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
