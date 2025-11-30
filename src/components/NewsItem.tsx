import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";
import "../styles/tags.css";

export interface NewsItemProps {
  title: string;
  content?: string;
  htmlContent?: string;
  editorState?: string;
  tags?: string[];
  link: string;
  isAdmin?: boolean;
  id?: string;
  createdAt?: any; // Firestore Timestamp or Date
  thumbnailUrl?: string;
}

const NewsItem: React.FC<NewsItemProps> = ({
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

  const truncateText = (
    text: string | undefined,
    wordLimit: number
  ): string => {
    if (!text) return "";
    const words = text.split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  const truncateHtmlContent = (html: string | undefined): string => {
    if (!html) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return truncateText(text, 20);
  };

  const handleReadArticle = () => {
    navigate(`/article/${link}`);
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "";
    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

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
