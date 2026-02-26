export interface SSRNewsItem {
  id: string;
  title: string;
  content?: string;
  htmlContentUrl?: string;
  previewText?: string;
  createdAt?: number | null;
  thumbnailUrl?: string;
}

export interface SSRArticle {
  id: string;
  title: string;
  tags?: string[];
  thumbnailUrl?: string;
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
