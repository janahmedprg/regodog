/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalEditor } from "lexical";
import type { JSX } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useArticleContext } from "../../context/ArticleContext";
import useModal from "../../hooks/useModal";
import {
  SPEECH_TO_TEXT_COMMAND,
  SUPPORT_SPEECH_RECOGNITION,
} from "../SpeechToTextPlugin";
import {
  saveEditorToFirebase,
  SaveEditorToFirebaseOptions,
} from "../SaveEditorToFirebasePlugin";
import { HeaderTags } from "../../../components/HeaderTags";

interface SaveArticleFormProps {
  editor: LexicalEditor;
  onClose: () => void;
  onSavingChange: (isSaving: boolean) => void;
  navigate: (path: string) => void;
  articleId?: string;
  initialTitle?: string;
  initialTags?: string[];
  initialThumbnailUrl?: string | null;
  onBeforeNavigate?: () => void;
}

function SaveArticleForm({
  editor,
  onClose,
  onSavingChange,
  navigate,
  articleId,
  initialTitle = "",
  initialTags = [],
  initialThumbnailUrl = null,
  onBeforeNavigate,
}: SaveArticleFormProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialThumbnailUrl,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableTags = Object.values(HeaderTags).map((tag: string) => tag);

  const handleTagChange = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setError(null);
    setIsSaving(true);
    onSavingChange(true);

    try {
      const options: SaveEditorToFirebaseOptions = {
        title: title.trim(),
        tags: selectedTags,
        thumbnailImage: selectedImage,
        existingThumbnailUrl: initialThumbnailUrl, // Preserve existing thumbnail if no new image
        articleId: articleId, // Pass articleId to update existing article
        onSuccess: (savedArticleId) => {
          setIsSaving(false);
          onSavingChange(false);
          onClose();
          // Call onBeforeNavigate callback if provided (e.g., to set isEditing to false)
          // This should be called before navigation
          if (onBeforeNavigate) {
            onBeforeNavigate();
          }
          // Navigate to the article page (for new articles) or stay on page (for updates)
          if (!articleId) {
            navigate(`/article/${savedArticleId}`);
          }
          // For updates, we're already on the article page, so just close the modal
          // and let the onBeforeNavigate callback handle UI updates (like setting isEditing to false)
        },
        onError: (err) => {
          setIsSaving(false);
          onSavingChange(false);
          setError(err.message || "Failed to save article");
        },
      };

      await saveEditorToFirebase(editor, options);
    } catch (err) {
      setIsSaving(false);
      onSavingChange(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save article. Please try again.",
      );
    }
  };

  return (
    <div style={{ padding: "20px", minWidth: "400px" }}>
      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="article-title"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Article Title: *
        </label>
        <input
          id="article-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter article title"
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          disabled={isSaving}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Tags:</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {availableTags.map((tag) => (
            <label
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagChange(tag)}
                disabled={isSaving}
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="article-thumbnail"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Thumbnail Image (optional):
        </label>
        <input
          id="article-thumbnail"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isSaving}
          style={{ marginBottom: "10px" }}
        />
        {imagePreview && (
          <div
            style={{
              marginTop: "10px",
              maxWidth: "200px",
              maxHeight: "200px",
              overflow: "hidden",
              borderRadius: "4px",
            }}
          >
            <img
              src={imagePreview}
              alt="Thumbnail preview"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "15px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <button
          onClick={onClose}
          disabled={isSaving}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving || !title.trim()}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isSaving || !title.trim() ? "not-allowed" : "pointer",
            opacity: isSaving || !title.trim() ? 0.5 : 1,
          }}
        >
          {isSaving
            ? "Saving..."
            : articleId
              ? "Update Article"
              : "Save Article"}
        </button>
      </div>
    </div>
  );
}

async function sendEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  try {
    await fetch("http://localhost:1235/setEditorState", {
      body: stringifiedEditorState,
      headers: {
        Accept: "application/json",
        "Content-type": "application/json",
      },
      method: "POST",
    });
  } catch {
    // NO-OP
  }
}

export default function ActionsPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [modal, showModal] = useModal();
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const {
    articleId,
    articleTitle,
    articleTags,
    articleThumbnailUrl,
    onBeforeNavigate,
  } = useArticleContext();

  const handleSaveToFirebase = useCallback(() => {
    const modalTitle = articleId
      ? "Update Article"
      : "Save Article to Firebase";
    showModal(modalTitle, (onClose) => {
      return (
        <SaveArticleForm
          editor={editor}
          onClose={onClose}
          onSavingChange={setIsSaving}
          navigate={navigate}
          articleId={articleId}
          initialTitle={articleTitle}
          initialTags={articleTags}
          initialThumbnailUrl={articleThumbnailUrl}
          onBeforeNavigate={onBeforeNavigate}
        />
      );
    });
  }, [
    editor,
    showModal,
    navigate,
    articleId,
    articleTitle,
    articleTags,
    articleThumbnailUrl,
    onBeforeNavigate,
  ]);

  return (
    <div className="actions">
      {SUPPORT_SPEECH_RECOGNITION && (
        <button
          onClick={() => {
            editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
            setIsSpeechToText(!isSpeechToText);
          }}
          className={
            "action-button action-button-mic " +
            (isSpeechToText ? "active" : "")
          }
          title="Speech To Text"
          aria-label={`${isSpeechToText ? "Enable" : "Disable"} speech to text`}
        >
          <i className="mic" />
        </button>
      )}
      <button
        className={`action-button ${!isEditable ? "unlock" : "lock"}`}
        onClick={() => {
          // Send latest editor state to commenting validation server
          if (isEditable) {
            sendEditorState(editor);
          }
          const newEditableState = !editor.isEditable();
          editor.setEditable(newEditableState);
          setIsEditable(newEditableState);
        }}
        title="Read-Only Mode"
        aria-label={`${!isEditable ? "Unlock" : "Lock"} read-only mode`}
      >
        <i className={!isEditable ? "unlock" : "lock"} />
      </button>
      <button
        className="action-button"
        onClick={handleSaveToFirebase}
        title="Save to Firebase"
        aria-label="Save article to Firebase"
        disabled={isSaving}
        style={{ fontSize: "17px" }}
      >
        Save Article
      </button>
      {modal}
    </div>
  );
}
