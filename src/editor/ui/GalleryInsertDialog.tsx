/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalEditor } from "lexical";
import type { JSX } from "react";

import { type ChangeEvent, useMemo, useState } from "react";

import Button from "./Button";
import { DialogActions } from "./Dialog";
import Select from "./Select";
import TextInput from "./TextInput";
import {
  DEFAULT_GALLERY_SIZE,
  DEFAULT_GALLERY_STRIP_GAP,
  DEFAULT_GALLERY_STRIP_HEIGHT,
  DEFAULT_GALLERY_STYLE,
  GalleryImage,
  GalleryStyle,
  GALLERY_STYLES,
  normalizeGallerySize,
  normalizeGalleryStripGap,
  normalizeGalleryStripHeight,
  normalizeGalleryStyle,
} from "../nodes/GalleryNode";
import "../plugins/GalleryPlugin/GalleryPlugin.css";

function parseGalleryText(value: string): GalleryImage[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry, idx) => {
      const [srcValue, ...altParts] = entry.split("|");
      const src = srcValue.trim();
      if (!src) {
        return null;
      }
      const altText = altParts.join("|").trim();
      return {
        src,
        altText: altText || `Image ${idx + 1}`,
      };
    })
    .filter((image): image is GalleryImage => image !== null);
}

function updateUploadedImageAlt(
  images: GalleryImage[],
  index: number,
  altText: string,
): GalleryImage[] {
  return images.map((image, imageIndex) =>
    imageIndex === index ? { ...image, altText } : image,
  );
}

function readImagesFromFiles(files: FileList): Promise<GalleryImage[]> {
  const imageFiles = Array.from(files).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imageFiles.length === 0) {
    return Promise.resolve([]);
  }

  const readAsDataUrl = (file: File): Promise<GalleryImage> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve({
          src: String(reader.result || ""),
          altText: file.name.replace(/\.[^.]+$/, "") || "Uploaded image",
        });
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });

  return Promise.all(imageFiles.map(readAsDataUrl));
}

function moveImage(
  images: GalleryImage[],
  from: number,
  to: number,
): GalleryImage[] {
  if (from === to || from < 0 || to < 0) {
    return images;
  }
  if (from >= images.length || to >= images.length) {
    return images;
  }
  const next = [...images];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function InsertGalleryDialog({
  activeEditor,
  onClose,
  onSubmit,
  initialImages,
  initialStyle,
  initialSize,
  initialStripGap,
  initialStripHeight,
  submitButtonText,
  title,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
  onSubmit: (payload: {
    images: GalleryImage[];
    style: GalleryStyle;
    size: number;
    stripGap: number;
    stripHeight: number;
  }) => void;
  initialImages?: readonly GalleryImage[];
  initialStyle?: GalleryStyle;
  initialSize?: number;
  initialStripGap?: number;
  initialStripHeight?: number;
  submitButtonText?: string;
  title?: string;
}): JSX.Element {
  const [value, setValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<GalleryImage[]>(() => [
    ...(initialImages || []),
  ]);
  const [style, setStyle] = useState<GalleryStyle>(
    normalizeGalleryStyle(initialStyle ?? DEFAULT_GALLERY_STYLE),
  );
  const [sizeValue, setSizeValue] = useState<string>(() =>
    String(normalizeGallerySize(initialSize ?? DEFAULT_GALLERY_SIZE)),
  );
  const [stripGapValue, setStripGapValue] = useState<string>(() =>
    String(
      normalizeGalleryStripGap(initialStripGap ?? DEFAULT_GALLERY_STRIP_GAP),
    ),
  );
  const [stripHeightValue, setStripHeightValue] = useState<string>(() =>
    String(
      normalizeGalleryStripHeight(
        initialStripHeight ?? DEFAULT_GALLERY_STRIP_HEIGHT,
      ),
    ),
  );
  const [isUploading, setIsUploading] = useState(false);
  const images = useMemo(
    () => [...parseGalleryText(value), ...uploadedImages],
    [uploadedImages, value],
  );
  const canInsert = images.length >= 2;

  const confirmLabel = submitButtonText
    ? submitButtonText
    : `Insert Gallery (${images.length} image${images.length === 1 ? "" : "s"})`;

  const onClick = () => {
    if (!canInsert) {
      return;
    }

    onSubmit({
      images,
      style,
      size: normalizeGallerySize(sizeValue),
      stripGap: normalizeGalleryStripGap(stripGapValue),
      stripHeight: normalizeGalleryStripHeight(stripHeightValue),
    });
    onClose();
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    try {
      const nextImages = await readImagesFromFiles(files);
      setUploadedImages((prev) => [...prev, ...nextImages]);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const moveUploadedImage = (from: number, to: number) => {
    setUploadedImages((prev) => moveImage(prev, from, to));
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) =>
      prev.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  return (
    <div className="GalleryPlugin__scrollArea">
      {title && <p style={{ marginTop: 10, marginBottom: 8 }}>{title}</p>}
      <p style={{ marginTop: 10, marginBottom: 8 }}>
        Paste one image per line. Optional alt text can be added with &nbsp;
        <code>imageUrl|alt text</code>.
      </p>
      <label className="Input__label" htmlFor="gallery-upload">
        Upload from your computer
      </label>
      <input
        id="gallery-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        disabled={isUploading}
        style={{ width: "100%" }}
      />
      {uploadedImages.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {uploadedImages.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginBottom: "6px",
                padding: "4px 6px",
                border: "1px solid #e1e5eb",
                borderRadius: "6px",
                backgroundColor: "#fff",
              }}
              className="GalleryPlugin__uploadRow"
            >
              <img
                src={image.src}
                alt={image.altText || `Uploaded image ${index + 1}`}
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={image.altText}
                onChange={(event) => {
                  const { value } = event.target;
                  setUploadedImages((prev) =>
                    updateUploadedImageAlt(prev, index, value),
                  );
                }}
                placeholder="Alt text"
                aria-label={`Alt text for uploaded image ${index + 1}`}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "1px solid #cfd6de",
                  borderRadius: "4px",
                  width: "100%",
                }}
              />
              <div
                className="GalleryPlugin__moveButtons"
                style={{ display: "flex", gap: "4px" }}
              >
                <button
                  type="button"
                  onClick={() => moveUploadedImage(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move image ${index + 1} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveUploadedImage(index, index + 1)}
                  disabled={index === uploadedImages.length - 1}
                  aria-label={`Move image ${index + 1} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="GalleryPlugin__removeButton"
                  onClick={() => removeUploadedImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {uploadedImages.length > 0 && (
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Uploaded {uploadedImages.length} image
          {uploadedImages.length === 1 ? "" : "s"} added.
        </p>
      )}
      <div style={{ marginTop: 12 }}>
        <Select
          label="Gallery style"
          value={style}
          onChange={(event) =>
            setStyle(normalizeGalleryStyle(event.target.value))
          }
        >
          <option value={GALLERY_STYLES.DEFAULT}>Default</option>
          <option value={GALLERY_STYLES.STRIP}>Horizontal strip</option>
          <option value={GALLERY_STYLES.SLIDESHOW}>
            Single image slideshow
          </option>
        </Select>
      </div>
      <TextInput
        label="Gallery width (25-160) (%)"
        type="number"
        value={sizeValue}
        onChange={setSizeValue}
        placeholder="100 (25-160)"
        data-test-id="gallery-size-input"
      />
      {style === GALLERY_STYLES.STRIP && (
        <>
          <TextInput
            label="Strip gap (0-48) (px)"
            type="number"
            value={stripGapValue}
            onChange={setStripGapValue}
            placeholder="12 (0-48)"
            data-test-id="gallery-strip-gap-input"
          />
          <TextInput
            label="Strip height (120-420) (px)"
            type="number"
            value={stripHeightValue}
            onChange={setStripHeightValue}
            placeholder="220 (120-420)"
            data-test-id="gallery-strip-height-input"
          />
        </>
      )}
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://example.com/hero.jpg|Hero image\nhttps://example.com/detail.jpg|Detail image"
        style={{
          width: "100%",
          minHeight: "120px",
          marginTop: "4px",
          padding: "8px",
          boxSizing: "border-box",
          resize: "vertical",
        }}
        data-test-id="gallery-modal-textarea"
      />
      <DialogActions>
        <Button disabled={!canInsert || isUploading} onClick={onClick}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </div>
  );
}
