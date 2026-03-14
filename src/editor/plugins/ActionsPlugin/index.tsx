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
import { useEffect, useRef, useState, useCallback } from "react";
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
  initialThumbnailPositionX?: number;
  initialThumbnailPositionY?: number;
  onBeforeNavigate?: () => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
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
  initialThumbnailPositionX = 50,
  initialThumbnailPositionY = 50,
  onBeforeNavigate,
}: SaveArticleFormProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialThumbnailUrl,
  );
  const [thumbnailPositionX, setThumbnailPositionX] = useState<number>(
    clampPercent(initialThumbnailPositionX),
  );
  const [thumbnailPositionY, setThumbnailPositionY] = useState<number>(
    clampPercent(initialThumbnailPositionY),
  );
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bannerAspect = Math.max(
    0.5,
    (typeof window === "undefined" ? 100 / 420 : window.innerWidth / 420),
  );

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
      setThumbnailPositionX(50);
      setThumbnailPositionY(50);
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
        thumbnailPositionX,
        thumbnailPositionY,
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
          // Navigate to the article page (for new articles) or refresh the page after updates.
          if (!articleId) {
            navigate(`/article/${savedArticleId}`);
            return;
          }

          if (typeof window !== "undefined") {
            window.location.reload();
          }
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

  const updatePositionFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const preview = previewRef.current;
      if (!preview) {
        return;
      }

      const rect = preview.getBoundingClientRect();
      const nextX = clampPercent(
        ((clientX - rect.left) / Math.max(1, rect.width)) * 100,
      );
      const nextY = clampPercent(
        ((clientY - rect.top) / Math.max(1, rect.height)) * 100,
      );
      setThumbnailPositionX(nextX);
      setThumbnailPositionY(nextY);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      updatePositionFromPointer(event.clientX, event.clientY);
    };
    const stopDrag = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [isDragging, updatePositionFromPointer]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!imagePreview || isSaving) {
        return;
      }

      event.preventDefault();
      setIsDragging(true);
      updatePositionFromPointer(event.clientX, event.clientY);
    },
    [imagePreview, isSaving, updatePositionFromPointer],
  );

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
              maxWidth: "280px",
            }}
          >
            <div
              ref={previewRef}
              onPointerDown={handlePointerDown}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: `${bannerAspect} / 1`,
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #ddd",
                background: "#f0f0f0",
                cursor: isSaving ? "not-allowed" : "grab",
              }}
            >
              <img
                src={imagePreview}
                alt="Thumbnail preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${thumbnailPositionX}% ${thumbnailPositionY}%`,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "8px",
                  border: "1px dashed rgba(255, 255, 255, 0.75)",
                  pointerEvents: "none",
                  opacity: 0.7,
                }}
              />
            </div>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
              Drag inside the preview to move the thumbnail focal point.
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                marginTop: "10px",
              }}
            >
              Horizontal
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={thumbnailPositionX}
                onChange={(event) =>
                  setThumbnailPositionX(clampPercent(Number(event.target.value)))
                }
                disabled={isSaving}
              />
              <span style={{ minWidth: "40px", textAlign: "right" }}>
                {Math.round(thumbnailPositionX)}%
              </span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              Vertical
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={thumbnailPositionY}
                onChange={(event) =>
                  setThumbnailPositionY(clampPercent(Number(event.target.value)))
                }
                disabled={isSaving}
              />
              <span style={{ minWidth: "40px", textAlign: "right" }}>
                {Math.round(thumbnailPositionY)}%
              </span>
            </label>
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
    articleThumbnailPositionX,
    articleThumbnailPositionY,
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
          initialThumbnailPositionX={articleThumbnailPositionX}
          initialThumbnailPositionY={articleThumbnailPositionY}
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
