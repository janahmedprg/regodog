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
// import Ad from "./Ad";

const NewsItem = ({
  title,
  content,
  link,
  button,
  isAdmin,
  onEdit,
  onRemove,
  id,
}) => {
  const navigate = useNavigate(); // Hook for navigation
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  const [editedTitle, setEditedTitle] = useState(title); // State for edited title
  const [editedContent, setEditedContent] = useState(content); // State for edited content

  // Function to handle "Read the Article" button click
  const handleReadArticle = () => {
    navigate(`/article/${link}`); // Redirect to the article page
  };

  // Function to handle "Edit" button click
  const handleEdit = () => {
    setIsEditing(true); // Enable edit mode
  };

  // Function to handle "Save" button click
  const handleSave = () => {
    onEdit(id, editedTitle, editedContent); // Pass the updated data to the parent component
    setIsEditing(false); // Disable edit mode
  };

  // Function to handle "Cancel" button click
  const handleCancel = () => {
    setIsEditing(false); // Disable edit mode
    setEditedTitle(title); // Reset edited title
    setEditedContent(content); // Reset edited content
  };

  // Function to handle "Remove" button click
  const handleRemove = () => {
    onRemove(id); // Pass the news item ID to the parent component
  };

  return (
    <div className="news-item">
      {isEditing ? (
        <>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
          />
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </>
      ) : (
        <>
          <p className="news-title">{title}</p>
          <p className="news-content">
            {content.length > 300 ? `${content.substring(0, 300)}...` : content}
          </p>
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

const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [newNews, setNewNews] = useState({ title: "", content: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch news items from Firebase
  useEffect(() => {
    const fetchNewsItems = async () => {
      const querySnapshot = await getDocs(collection(db, "news"));
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Include the document ID for editing and redirection
        ...doc.data(),
      }));
      setNewsItems(items);
    };

    fetchNewsItems();

    const checkIfAdmin = async (userId) => {
      try {
        const querySnapshot = await getDocs(collection(db, "check-admin"));
        const isAdmin = querySnapshot.docs.some(
          (doc) => doc.data().id === userId
        );
        console.log(isAdmin);
        return isAdmin;
      } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
    };

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdmin = await checkIfAdmin(user.uid);
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false); // User is not logged in
      }
    });
  }, []);

  // Handle form submission to post new news
  const handlePostNews = async (e) => {
    e.preventDefault();
    if (newNews.title && newNews.content) {
      try {
        await addDoc(collection(db, "news"), {
          title: newNews.title,
          content: newNews.content,
          timestamp: new Date(),
        });
        setNewNews({ title: "", content: "" });
      } catch (err) {
        console.error("Error adding news item: ", err);
      }
    }
  };

  // Handle edit button click
  const handleEdit = async (id, newTitle, newContent) => {
    try {
      const newsDocRef = doc(db, "news", id); // Reference to the specific document
      await updateDoc(newsDocRef, {
        title: newTitle,
        content: newContent,
      });
      console.log("News item updated successfully!");

      // Update the local state to reflect the changes
      setNewsItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? { ...item, title: newTitle, content: newContent }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating news item: ", error);
    }
  };

  const handleRemove = async (id) => {
    try {
      const newsDocRef = doc(db, "news", id); // Reference to the specific document
      await deleteDoc(newsDocRef); // Delete the document
      console.log("News item removed successfully!");

      // Update the local state to remove the deleted item
      setNewsItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing news item: ", error);
    }
  };

  return (
    <div className="news-feed">
      <h2 className="news-header">NEWS FEED</h2>

      {/* Display NewsItems from Firebase */}
      {newsItems.map((item, index) => (
        <NewsItem
          key={index}
          id={item.id} // Pass the document ID for editing
          title={item.title}
          content={item.content}
          link={item.id} // Pass the article ID for redirection
          button="Read the Article"
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      ))}
      {/* <Ad></Ad> */}

      {/* If the user is an admin, show form to post new news */}
      {isAdmin && (
        <form onSubmit={handlePostNews} className="news-post-form">
          <input
            type="text"
            placeholder="Title"
            value={newNews.title}
            onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
          />
          <textarea
            placeholder="Content"
            value={newNews.content}
            onChange={(e) =>
              setNewNews({ ...newNews, content: e.target.value })
            }
          />
          <button type="submit">Post News</button>
        </form>
      )}
    </div>
  );
};

export default NewsFeed;
