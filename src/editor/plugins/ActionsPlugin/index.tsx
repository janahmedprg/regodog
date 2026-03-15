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
  initialPinned?: boolean;
  initialPinnedOrder?: number;
  initialThumbnailUrl?: string | null;
  initialThumbnailAltText?: string;
  initialThumbnailPositionX?: number;
  initialThumbnailPositionY?: number;
  initialNewsFeedPositionX?: number;
  initialNewsFeedPositionY?: number;
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
  initialPinned = false,
  initialPinnedOrder,
  initialThumbnailUrl = null,
  initialThumbnailAltText = "",
  initialThumbnailPositionX = 50,
  initialThumbnailPositionY = 50,
  initialNewsFeedPositionX = 50,
  initialNewsFeedPositionY = 50,
  onBeforeNavigate,
}: SaveArticleFormProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [isPinned, setIsPinned] = useState<boolean>(initialPinned);
  const [pinnedOrderInput, setPinnedOrderInput] = useState<string>(() =>
    initialPinned && typeof initialPinnedOrder === "number" && Number.isFinite(initialPinnedOrder)
      ? String(Math.max(0, Math.floor(initialPinnedOrder)))
      : "",
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialThumbnailUrl,
  );
  const [thumbnailAltText, setThumbnailAltText] = useState<string>(
    initialThumbnailAltText,
  );
  const [activeDragTarget, setActiveDragTarget] = useState<
    "thumbnail" | "newsFeed" | null
  >(null);
  const [thumbnailPositionX, setThumbnailPositionX] = useState<number>(
    clampPercent(initialThumbnailPositionX),
  );
  const [thumbnailPositionY, setThumbnailPositionY] = useState<number>(
    clampPercent(initialThumbnailPositionY),
  );
  const [newsFeedPositionX, setNewsFeedPositionX] = useState<number>(
    clampPercent(initialNewsFeedPositionX),
  );
  const [newsFeedPositionY, setNewsFeedPositionY] = useState<number>(
    clampPercent(initialNewsFeedPositionY),
  );
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const newsFeedPreviewRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isPinned) {
      setPinnedOrderInput("");
      return;
    }
  }, [isPinned]);

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
      setNewsFeedPositionX(50);
      setNewsFeedPositionY(50);
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
      const nextPinnedOrderValue =
        pinnedOrderInput.trim() === ""
          ? 0
          : Math.max(
              0,
              Math.floor(Number.parseInt(pinnedOrderInput, 10) || 0),
            );

      const options: SaveEditorToFirebaseOptions = {
        title: title.trim(),
        tags: selectedTags,
        pinned: isPinned,
        pinnedOrder: nextPinnedOrderValue,
        thumbnailImage: selectedImage,
        thumbnailAltText: thumbnailAltText.trim(),
        thumbnailPositionX,
        thumbnailPositionY,
        newsFeedThumbnailPositionX: newsFeedPositionX,
        newsFeedThumbnailPositionY: newsFeedPositionY,
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
    (
      clientX: number,
      clientY: number,
      preview: HTMLDivElement | null,
      setX: (value: number) => void,
      setY: (value: number) => void,
    ) => {
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
      setX(nextX);
      setY(nextY);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging || !activeDragTarget) {
      return;
    }

    const activePreview =
      activeDragTarget === "newsFeed"
        ? newsFeedPreviewRef.current
        : previewRef.current;
    const setX =
      activeDragTarget === "newsFeed"
        ? setNewsFeedPositionX
        : setThumbnailPositionX;
    const setY =
      activeDragTarget === "newsFeed"
        ? setNewsFeedPositionY
        : setThumbnailPositionY;

    const handleMove = (event: PointerEvent) => {
      updatePositionFromPointer(
        event.clientX,
        event.clientY,
        activePreview,
        setX,
        setY,
      );
    };
    const stopDrag = () => {
      setIsDragging(false);
      setActiveDragTarget(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [isDragging, activeDragTarget, updatePositionFromPointer]);

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      target: "thumbnail" | "newsFeed",
    ) => {
      if (!imagePreview || isSaving) {
        return;
      }

      event.preventDefault();
      const preview =
        target === "newsFeed" ? newsFeedPreviewRef.current : previewRef.current;
      const setX =
        target === "newsFeed" ? setNewsFeedPositionX : setThumbnailPositionX;
      const setY =
        target === "newsFeed" ? setNewsFeedPositionY : setThumbnailPositionY;
      setActiveDragTarget(target);
      setIsDragging(true);
      updatePositionFromPointer(
        event.clientX,
        event.clientY,
        preview,
        setX,
        setY,
      );
    },
    [
      imagePreview,
      isSaving,
      newsFeedPreviewRef,
      setActiveDragTarget,
      setIsDragging,
      updatePositionFromPointer,
    ],
  );

  return (
    <div
      className="SaveArticleForm__scrollArea"
      style={{
        padding: "20px",
        maxWidth: "500px",
        maxHeight: "min(75vh, calc(100vh - 160px))",
        overflowY: "auto",
      }}
    >
      <div style={{ marginBottom: "15px", width: "90%" }}>
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
          htmlFor="article-pinned"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: isSaving ? "not-allowed" : "pointer",
          }}
        >
          <input
            id="article-pinned"
            type="checkbox"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
            disabled={isSaving}
          />
          Pin this article to homepage
        </label>
      </div>
      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="article-pinned-order"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Pinned order (lower number appears first)
        </label>
        <input
          id="article-pinned-order"
          type="text"
          inputMode="numeric"
          value={pinnedOrderInput}
          onChange={(event) => {
            const nextValue = event.target.value
              .replace(/[^0-9]/g, "")
              .replace(/^0+(?=\d)/, "");
            setPinnedOrderInput(nextValue);
          }}
          disabled={isSaving}
          style={{ width: "120px", padding: "8px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "4px" }}
        />
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
            <label
              htmlFor="article-thumbnail-alt"
              style={{ display: "block", marginBottom: "5px", marginTop: "10px" }}
            >
              Thumbnail Alt Text (optional):
            </label>
            <input
              id="article-thumbnail-alt"
              type="text"
              value={thumbnailAltText}
              onChange={(event) => setThumbnailAltText(event.target.value)}
              placeholder="Describe thumbnail for accessibility and SEO"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              disabled={isSaving}
              maxLength={220}
            />
            {imagePreview && (
              <div
                style={{
              marginTop: "10px",
              maxWidth: "280px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#555",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                Article banner preview (4:1)
              </div>
              <div
                ref={previewRef}
                onPointerDown={(event) => handlePointerDown(event, "thumbnail")}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/1",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #ddd",
                  background: "#f0f0f0",
                  cursor: isSaving ? "not-allowed" : "grab",
                }}
              >
                <img
                  src={imagePreview}
                  alt="Article banner thumbnail preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `${thumbnailPositionX}% ${thumbnailPositionY}%`,
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#555",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                News feed preview (16:9)
              </div>
              <div
                ref={newsFeedPreviewRef}
                onPointerDown={(event) => handlePointerDown(event, "newsFeed")}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #ddd",
                  background: "#f0f0f0",
                  cursor: isSaving ? "not-allowed" : "grab",
                }}
              >
                <img
                  src={imagePreview}
                  alt="News feed thumbnail preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `${newsFeedPositionX}% ${newsFeedPositionY}%`,
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              Horizontal (Article Banner)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={thumbnailPositionX}
                onChange={(event) =>
                  setThumbnailPositionX(
                    clampPercent(Number(event.target.value)),
                  )
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
              Vertical (Article Banner)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={thumbnailPositionY}
                onChange={(event) =>
                  setThumbnailPositionY(
                    clampPercent(Number(event.target.value)),
                  )
                }
                disabled={isSaving}
              />
              <span style={{ minWidth: "40px", textAlign: "right" }}>
                {Math.round(thumbnailPositionY)}%
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
              Horizontal (News Feed)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={newsFeedPositionX}
                onChange={(event) =>
                  setNewsFeedPositionX(clampPercent(Number(event.target.value)))
                }
                disabled={isSaving}
              />
              <span style={{ minWidth: "40px", textAlign: "right" }}>
                {Math.round(newsFeedPositionX)}%
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
              Vertical (News Feed)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={newsFeedPositionY}
                onChange={(event) =>
                  setNewsFeedPositionY(clampPercent(Number(event.target.value)))
                }
                disabled={isSaving}
              />
              <span style={{ minWidth: "40px", textAlign: "right" }}>
                {Math.round(newsFeedPositionY)}%
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
    articlePinned,
    articlePinnedOrder,
    articleThumbnailUrl,
    articleThumbnailAltText,
    articleThumbnailPositionX,
    articleThumbnailPositionY,
    newsFeedThumbnailPositionX,
    newsFeedThumbnailPositionY,
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
          initialPinned={articlePinned}
          initialPinnedOrder={articlePinnedOrder}
          initialThumbnailUrl={articleThumbnailUrl}
          initialThumbnailAltText={articleThumbnailAltText}
          initialThumbnailPositionX={articleThumbnailPositionX}
          initialThumbnailPositionY={articleThumbnailPositionY}
          initialNewsFeedPositionX={newsFeedThumbnailPositionX}
          initialNewsFeedPositionY={newsFeedThumbnailPositionY}
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
    articlePinned,
    articlePinnedOrder,
    articleThumbnailUrl,
    articleThumbnailAltText,
    articleThumbnailPositionX,
    articleThumbnailPositionY,
    newsFeedThumbnailPositionX,
    newsFeedThumbnailPositionY,
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
