import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";
import "../styles/tags.css";

const NewsItem = ({
  title,
  content,
  htmlContent,
  editorState,
  tags,
  link,
  isAdmin,
  id,
  createdAt,
  thumbnailUrl,
}) => {
  const navigate = useNavigate();

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
    <div className="news-item" onClick={handleReadArticle}>
      {thumbnailUrl && (
        <div className="news-thumbnail">
          <img src={thumbnailUrl} alt="Article thumbnail" />
        </div>
      )}
      <p className="news-title">{title}</p>
      <p className="news-date">{formatDate(createdAt)}</p>
      {/* <div className="article-tags">
        {tags &&
          tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
      </div> */}
      <div className="news-content">
        {htmlContent ? (
          <div>{truncateHtmlContent(htmlContent)}</div>
        ) : (
          <p>{truncateText(content, 20)}</p>
        )}
      </div>
      <div className="news-button">Read the Article</div>
    </div>
  );
};

export default NewsItem;
