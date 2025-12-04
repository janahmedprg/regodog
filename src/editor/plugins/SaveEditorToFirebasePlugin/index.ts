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

export interface SaveEditorToFirebaseOptions {
  title: string;
  tags?: string[];
  thumbnailImage?: File | null;
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
    
    if (articleId) {
      try {
        const articleRef = doc(db, "news", articleId);
        const articleSnap = await getDoc(articleRef);
        if (articleSnap.exists()) {
          const articleData = articleSnap.data();
          oldEditorStateUrl = articleData.editorStateUrl || null;
          oldHtmlContentUrl = articleData.htmlContentUrl || null;
        }
      } catch (err) {
        console.warn("Error fetching existing article:", err);
        // Continue even if fetch fails
      }
    }

    // Get editor state and serialize it
    const uniqueId = `${Date.now()}-${uuidv4()}`;
    const editorState = editor.getEditorState();
    const serializedState = JSON.stringify(editorState.toJSON());

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

    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });

    const htmlRef = ref(storage, `editor_html/${uniqueId}.html`);
    const htmlSnapshot = await uploadBytes(htmlRef, htmlBlob);
    const htmlContentUrl = await getDownloadURL(htmlSnapshot.ref);

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
      thumbnailUrl?: string | null;
      lastUpdated: Date;
      author?: string;
      createdAt?: Date;
    } = {
      title,
      editorStateUrl: editorStateUrl,
      htmlContentUrl,
      tags,
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

