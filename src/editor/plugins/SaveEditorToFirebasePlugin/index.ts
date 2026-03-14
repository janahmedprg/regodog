/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalEditor } from "lexical";

import { $generateHtmlFromNodes } from "@lexical/html";
import {
  db,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  auth,
  deleteObject,
} from "../../../config/firebase";

import { v4 as uuidv4 } from "uuid";

type SerializedEditorPayload = string | number | boolean | null | {
  [key: string]: SerializedEditorPayload | SerializedEditorPayload[];
};

type SerializableObject = Record<string, SerializedEditorPayload>;

function isBase64ImageSrc(src: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(src);
}

function getStoragePathFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const urlObj = new URL(downloadUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (!pathMatch) {
      return null;
    }
    return decodeURIComponent(pathMatch[1]);
  } catch {
    return null;
  }
}

function isArticleImageUrl(url: string): boolean {
  const storagePath = getStoragePathFromDownloadUrl(url);
  return typeof storagePath === "string" && storagePath.startsWith("article_images/");
}

function collectArticleImageUrls(
  node: SerializedEditorPayload,
  result: Set<string>,
): void {
  if (node === null || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectArticleImageUrls(item, result));
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (
      key === "src" &&
      typeof value === "string" &&
      isArticleImageUrl(value)
    ) {
      result.add(value);
    }
    collectArticleImageUrls(value as SerializedEditorPayload, result);
  }
}

function collectFromSerializedState(node: SerializedEditorPayload): string[] {
  const result = new Set<string>();
  collectArticleImageUrls(node, result);
  return Array.from(result);
}

function safeDeleteStorageUrl(downloadUrl: string): void {
  const storagePath = getStoragePathFromDownloadUrl(downloadUrl);
  if (!storagePath) {
    return;
  }

  const objectRef = ref(storage, storagePath);
  deleteObject(objectRef).catch((error) => {
    console.warn("Error deleting unused image:", error);
  });
}

function imageExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
  if (!match) {
    return "png";
  }

  const mime = match[1].toLowerCase();
  if (mime === "jpeg") {
    return "jpg";
  }
  if (mime === "svg+xml") {
    return "svg";
  }

  return mime.replace(/[^a-z0-9]/g, "");
}

async function uploadDataImageToStorage(
  dataUrl: string,
  articleId: string,
  uploadCache: Map<string, Promise<string>>,
): Promise<string> {
  const cachedUpload = uploadCache.get(dataUrl);
  if (cachedUpload) {
    return cachedUpload;
  }

  const uploadPromise = (async () => {
    const imageBlob = await fetch(dataUrl).then((response) => {
      if (!response.ok) {
        throw new Error("Failed to decode embedded image data URL");
      }
      return response.blob();
    });

    const extension = imageExtensionFromDataUrl(dataUrl);
    const imageRef = ref(storage, `article_images/${articleId}/${uuidv4()}.${extension}`);
    const snapshot = await uploadBytes(imageRef, imageBlob);
    return getDownloadURL(snapshot.ref);
  })();

  uploadCache.set(dataUrl, uploadPromise);
  return uploadPromise;
}

async function normalizeSerializedEditorState(
  node: SerializedEditorPayload,
  articleId: string,
  uploadCache: Map<string, Promise<string>>,
): Promise<SerializedEditorPayload> {
  if (node === null || typeof node !== "object") {
    return node;
  }

  if (Array.isArray(node)) {
    return Promise.all(
      node.map((child) => normalizeSerializedEditorState(child, articleId, uploadCache)),
    );
  }

  const normalized: { [key: string]: SerializedEditorPayload } = {};

  for (const [key, value] of Object.entries(node)) {
    const shouldUpload =
      (key === "src" && typeof value === "string" && isBase64ImageSrc(value)) ||
      (key === "images" && Array.isArray(value));

    if (shouldUpload && key === "src" && typeof value === "string") {
      normalized[key] = await uploadDataImageToStorage(
        value,
        articleId,
        uploadCache,
      );
      continue;
    }

    if (key === "images" && Array.isArray(value)) {
      normalized[key] = await Promise.all(
        value.map(async (image) => {
          if (
            image !== null &&
            typeof image === "object" &&
            "src" in image
          ) {
            const nextImage = { ...(image as Record<string, SerializedEditorPayload>) };
            const src = nextImage.src;

            if (typeof src === "string" && isBase64ImageSrc(src)) {
              nextImage.src = await uploadDataImageToStorage(src, articleId, uploadCache);
            }

            return nextImage;
          }

          return image as SerializedEditorPayload;
        }),
      );
      continue;
    }

    normalized[key] = await normalizeSerializedEditorState(
      value as SerializedEditorPayload,
      articleId,
      uploadCache,
    );
  }

  return normalized;
}

export interface SaveEditorToFirebaseOptions {
  title: string;
  tags?: string[];
  thumbnailImage?: File | null;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
  existingThumbnailUrl?: string | null; // Existing thumbnail URL to preserve if no new image is uploaded
  articleId?: string; // If provided, will update existing article instead of creating new one
  onSuccess?: (articleId: string) => void;
  onError?: (error: Error) => void;
}

export async function saveEditorToFirebase(
  editor: LexicalEditor,
  options: SaveEditorToFirebaseOptions
): Promise<string | null> {
  const {
    title,
    tags = [],
    thumbnailImage,
    thumbnailPositionX,
    thumbnailPositionY,
    newsFeedThumbnailPositionX,
    newsFeedThumbnailPositionY,
    existingThumbnailUrl,
    articleId,
    onSuccess,
    onError,
  } = options;

  if (!title.trim()) {
    const error = new Error("Title is required");
    onError?.(error);
    throw error;
  }

  try {
    // If updating an existing article, fetch it to get old file URLs for deletion
    let oldEditorStateUrl: string | null = null;
    let oldHtmlContentUrl: string | null = null;
    let oldEmbeddedImageUrls: string[] = [];
    
    if (articleId) {
      try {
        const articleRef = doc(db, "news", articleId);
        const articleSnap = await getDoc(articleRef);
        if (articleSnap.exists()) {
          const articleData = articleSnap.data();
          oldEditorStateUrl = articleData.editorStateUrl || null;
          oldHtmlContentUrl = articleData.htmlContentUrl || null;
          if (Array.isArray(articleData.embeddedImageUrls)) {
            oldEmbeddedImageUrls = articleData.embeddedImageUrls.filter(
              (entry: unknown) => typeof entry === "string",
            );
          }

          if (
            oldEmbeddedImageUrls.length === 0 &&
            typeof oldEditorStateUrl === "string"
          ) {
            try {
              const response = await fetch(oldEditorStateUrl);
              if (response.ok) {
                const oldSerialized = (await response.text()) as SerializedEditorPayload;
                oldEmbeddedImageUrls = collectFromSerializedState(
                  JSON.parse(oldSerialized as string),
                );
              }
            } catch (err) {
              console.warn("Error parsing old editor state for image cleanup:", err);
            }
          }
        }
      } catch (err) {
        console.warn("Error fetching existing article:", err);
        // Continue even if fetch fails
      }
    }

    // Get editor state and normalize inline image data URLs
    const uniqueId = `${Date.now()}-${uuidv4()}`;
    const editorState = editor.getEditorState();
    const uploadCache = new Map<string, Promise<string>>();
    const normalizedState =
      (await normalizeSerializedEditorState(
        editorState.toJSON() as SerializedEditorPayload,
        uniqueId,
        uploadCache,
      )) || editorState.toJSON();
    const serializedState = JSON.stringify(normalizedState);

    const editorStateBlob = new Blob([serializedState], {
      type: "application/json",
    });

    const editorStateRef = ref(storage, `editor_state/${uniqueId}.json`);
    const editorStateSnapshot = await uploadBytes(editorStateRef, editorStateBlob);
    const editorStateUrl = await getDownloadURL(editorStateSnapshot.ref);

    // Generate HTML content from editor state
    let htmlContent = "";
    editorState.read(() => {
      htmlContent = $generateHtmlFromNodes(editor, null);
    });

    const replacementEntries = await Promise.all(
      Array.from(uploadCache.entries()).map(async ([from, toPromise]) => [
        from,
        await toPromise,
      ]),
    );
    for (const [from, to] of replacementEntries) {
      htmlContent = htmlContent.split(from).join(to as string);
    }

    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });

    const htmlRef = ref(storage, `editor_html/${uniqueId}.html`);
    const htmlSnapshot = await uploadBytes(htmlRef, htmlBlob);
    const htmlContentUrl = await getDownloadURL(htmlSnapshot.ref);

    const currentEmbeddedImageUrls = collectFromSerializedState(
      normalizedState as SerializedEditorPayload,
    );
    const oldImageSet = new Set(oldEmbeddedImageUrls.filter(isArticleImageUrl));
    const currentImageSet = new Set(currentEmbeddedImageUrls);
    const removedImageUrls = Array.from(oldImageSet).filter(
      (url) => !currentImageSet.has(url),
    );

    // Delete old editor state and HTML files if they exist
    if (oldEditorStateUrl) {
      try {
        // Extract path from Firebase Storage download URL
        // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2FTO%2FFILE?alt=media&token=...
        const urlObj = new URL(oldEditorStateUrl);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
        if (pathMatch) {
          const decodedPath = decodeURIComponent(pathMatch[1]);
          const oldEditorStateRef = ref(storage, decodedPath);
          await deleteObject(oldEditorStateRef);
        }
      } catch (err) {
        console.warn("Error deleting old editor state:", err);
      }
    }

    if (oldHtmlContentUrl) {
      try {
        // Extract path from Firebase Storage download URL
        const urlObj = new URL(oldHtmlContentUrl);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
        if (pathMatch) {
          const decodedPath = decodeURIComponent(pathMatch[1]);
          const oldHtmlRef = ref(storage, decodedPath);
          await deleteObject(oldHtmlRef);
        }
      } catch (err) {
        console.warn("Error deleting old HTML content:", err);
      }
    }

    removedImageUrls.forEach((imageUrl) => {
      safeDeleteStorageUrl(imageUrl);
    });


    // Upload thumbnail image if provided, otherwise preserve existing one
    let thumbnailUrl: string | null = existingThumbnailUrl || null;
    if (thumbnailImage) {
      const imageRef = ref(
        storage,
        `thumbnails/${Date.now()}_${thumbnailImage.name}`
      );
      const snapshot = await uploadBytes(imageRef, thumbnailImage);
      const newUrl = await getDownloadURL(snapshot.ref);
      if (thumbnailUrl) {
        try {
          const imgRef = ref(storage, thumbnailUrl);
          await deleteObject(imgRef);
        } catch (err) {
          console.warn("Error deleting image:", err);
        }
      }
      thumbnailUrl = newUrl;
    }

  const articleData: {
      title: string;
      editorStateUrl: string;
      htmlContentUrl: string;
      tags: string[];
      thumbnailPositionX?: number;
      thumbnailPositionY?: number;
      newsFeedThumbnailPositionX?: number;
      newsFeedThumbnailPositionY?: number;
      thumbnailUrl?: string | null;
      lastUpdated: Date;
      author?: string;
      createdAt?: Date;
    } = {
      title,
      editorStateUrl: editorStateUrl,
      htmlContentUrl,
      tags,
      embeddedImageUrls: currentEmbeddedImageUrls,
      lastUpdated: new Date(),
      author: auth.currentUser?.uid || "anonymous",
    };

    // Include thumbnailUrl if it exists (either new or existing)
    if (thumbnailUrl) {
      articleData.thumbnailUrl = thumbnailUrl;
    } else if (articleId && existingThumbnailUrl === null) {
      // If updating and explicitly setting to null, include it
      articleData.thumbnailUrl = null;
    }

    const normalizedPositionX =
      typeof thumbnailPositionX === "number" && Number.isFinite(thumbnailPositionX)
        ? Math.max(0, Math.min(100, Math.round(thumbnailPositionX)))
        : undefined;
    const normalizedPositionY =
      typeof thumbnailPositionY === "number" && Number.isFinite(thumbnailPositionY)
        ? Math.max(0, Math.min(100, Math.round(thumbnailPositionY)))
        : undefined;
    const normalizedNewsFeedPositionX =
      typeof newsFeedThumbnailPositionX === "number" &&
      Number.isFinite(newsFeedThumbnailPositionX)
        ? Math.max(0, Math.min(100, Math.round(newsFeedThumbnailPositionX)))
        : undefined;
    const normalizedNewsFeedPositionY =
      typeof newsFeedThumbnailPositionY === "number" &&
      Number.isFinite(newsFeedThumbnailPositionY)
        ? Math.max(0, Math.min(100, Math.round(newsFeedThumbnailPositionY)))
        : undefined;

    const hasAnyThumbnailPayload = Boolean(
      thumbnailImage || existingThumbnailUrl || thumbnailUrl,
    );
    if (normalizedPositionX !== undefined && hasAnyThumbnailPayload) {
      articleData.thumbnailPositionX = normalizedPositionX;
    }
    if (normalizedPositionY !== undefined && hasAnyThumbnailPayload) {
      articleData.thumbnailPositionY = normalizedPositionY;
    }
    if (normalizedNewsFeedPositionX !== undefined && hasAnyThumbnailPayload) {
      articleData.newsFeedThumbnailPositionX = normalizedNewsFeedPositionX;
    }
    if (normalizedNewsFeedPositionY !== undefined && hasAnyThumbnailPayload) {
      articleData.newsFeedThumbnailPositionY = normalizedNewsFeedPositionY;
    }

    let documentId: string;

    if (articleId) {
      // Update existing article
      const articleRef = doc(db, "news", articleId);
      await updateDoc(articleRef, articleData);
      documentId = articleId;
    } else {
      // Create new article
      articleData.createdAt = new Date();
      const docRef = await addDoc(collection(db, "news"), articleData);
      documentId = docRef.id;
    }

    onSuccess?.(documentId);
    return documentId;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error saving editor to Firebase:", err);
    onError?.(err);
    throw err;
  }
}
