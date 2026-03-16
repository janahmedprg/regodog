export interface SSRNewsItem {
  id: string;
  title: string;
  content?: string;
  htmlContentUrl?: string;
  previewText?: string;
  pinned?: boolean;
  pinnedOrder?: number;
  tagPinnedOrders?: Record<string, number>;
  createdAt?: number | null;
  lastUpdated?: number | null;
  thumbnailUrl?: string;
  thumbnailAltText?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
}

export interface SSRArticle {
  id: string;
  title: string;
  tags?: string[];
  pinned?: boolean;
  pinnedOrder?: number;
  tagPinnedOrders?: Record<string, number>;
  thumbnailUrl?: string;
  thumbnailAltText?: string;
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
