export interface SSRNewsItem {
  id: string;
  title: string;
  content?: string;
  htmlContentUrl?: string;
  previewText?: string;
  createdAt?: number | null;
  lastUpdated?: number | null;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
}

export interface SSRArticle {
  id: string;
  title: string;
  tags?: string[];
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
  editorStateUrl?: string;
  htmlContentUrl?: string;
  content?: string;
  htmlContent?: string;
}

export interface SSRData {
  article?: SSRArticle;
  newsItems?: SSRNewsItem[];
  tag?: string;
}
