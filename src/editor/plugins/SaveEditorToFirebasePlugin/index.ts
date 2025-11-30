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
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  auth,
} from "../../../config/firebase";

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
    // Get editor state and serialize it
    const editorState = editor.getEditorState();
    const serializedState = JSON.stringify(editorState.toJSON());

    // Generate HTML content from editor state
    let htmlContent = "";
    editorState.read(() => {
      htmlContent = $generateHtmlFromNodes(editor, null);
    });

    // Upload thumbnail image if provided, otherwise preserve existing one
    let thumbnailUrl: string | null = existingThumbnailUrl || null;
    if (thumbnailImage) {
      const imageRef = ref(
        storage,
        `thumbnails/${Date.now()}_${thumbnailImage.name}`
      );
      const snapshot = await uploadBytes(imageRef, thumbnailImage);
      thumbnailUrl = await getDownloadURL(snapshot.ref);
    }

    const articleData: {
      title: string;
      editorState: string;
      htmlContent: string;
      tags: string[];
      thumbnailUrl?: string | null;
      lastUpdated: Date;
      author?: string;
      createdAt?: Date;
    } = {
      title,
      editorState: serializedState,
      htmlContent,
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

