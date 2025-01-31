// src/NewsFeed.js
import React, { useEffect, useState } from "react";
import { auth, db, collection, getDocs, addDoc } from "../config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
// import Ad from "./Ad";

const NewsItem = ({ title, content, link, button }) => (
  <div className="news-item">
    <p className="news-title">{title}</p>
    <p className="news-content">{content}</p>
    {button && <button className="news-button">{button}</button>}
  </div>
);

const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [newNews, setNewNews] = useState({ title: "", content: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch news items from Firebase
  useEffect(() => {
    const fetchNewsItems = async () => {
      const querySnapshot = await getDocs(collection(db, "news"));
      const items = querySnapshot.docs.map((doc) => doc.data());
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

  return (
    <div className="news-feed">
      <h2 className="news-header">NEWS FEED</h2>

      {/* Display NewsItems from Firebase */}
      {newsItems.map((item, index) => (
        <NewsItem
          key={index}
          title={item.title}
          content={item.content}
          button="Read the Article"
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
