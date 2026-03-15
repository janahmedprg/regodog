import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";
import "../styles/tags.css";

function decodeHtmlEntities(text: string): string {
  if (!text || !text.includes("&")) {
    return text;
  }

  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return text.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isNaN(codePoint)) {
        return match;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }

    return namedEntities[entity] ?? match;
  });
}

export interface NewsItemProps {
  title: string;
  content?: string;
  htmlContentUrl?: string;
  previewText?: string;
  editorStateUrl?: string;
  tags?: string[];
  link: string;
  isAdmin?: boolean;
  id?: string;
  createdAt?: any; // Firestore Timestamp or Date
  thumbnailUrl?: string;
  thumbnailAltText?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
}

const NewsItem: React.FC<NewsItemProps> = ({
  title,
  content,
  htmlContentUrl,
  previewText,
  link,
  createdAt,
  thumbnailUrl,
  thumbnailAltText,
  thumbnailPositionX,
  thumbnailPositionY,
  newsFeedThumbnailPositionX,
  newsFeedThumbnailPositionY,
}) => {
  const navigate = useNavigate();

  const [htmlPreviewText, setHtmlPreviewText] = useState<string | null>(null);

  const truncateText = (
    text: string | undefined,
    wordLimit: number
  ): string => {
    if (!text) return "";
    const words = text.split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  const extractTextFromHtml = (html: string): string =>
    decodeHtmlEntities(
      html
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    );

  // Fetch preview on client only when SSR preview text is not provided.
  useEffect(() => {
    if (!htmlContentUrl || previewText) return;

    const fetchHtml = async () => {
      try {
        const response = await fetch(htmlContentUrl);
        const html = await response.text();
        setHtmlPreviewText(truncateText(extractTextFromHtml(html), 40));
      } catch (err) {
        console.error("Error loading HTML content preview:", err);
        setHtmlPreviewText(null);
      }
    };

    fetchHtml();
  }, [htmlContentUrl, previewText]);

  const htmlPreview = previewText || htmlPreviewText;
  const decodedTitle = decodeHtmlEntities(title);
  const decodedContent = decodeHtmlEntities(content || "");
  const decodedHtmlPreview = htmlPreview ? decodeHtmlEntities(htmlPreview) : "";

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
    });
  };

  return (
    <div className="news-item" onClick={handleReadArticle}>
      {thumbnailUrl && (
        <div className="news-thumbnail">
          <img
            src={thumbnailUrl}
            alt={thumbnailAltText || "Article thumbnail"}
            style={{
              objectPosition: `${newsFeedThumbnailPositionX ?? thumbnailPositionX ?? 50}% ${
                newsFeedThumbnailPositionY ?? thumbnailPositionY ?? 50
              }%`,
            }}
          />
        </div>
      )}

      <p className="news-title">{decodedTitle}</p>
      <p className="news-date">{formatDate(createdAt)}</p>

      <div className="news-content">
        {/* Prefer HTML preview if available */}
        {htmlContentUrl ? (
          <p>{decodedHtmlPreview || truncateText(decodedContent, 20)}</p>
        ) : (
          <p>{truncateText(decodedContent, 20)}</p>
        )}
      </div>

      <div className="news-button">Read the Article</div>
    </div>
  );
};

export default NewsItem;
