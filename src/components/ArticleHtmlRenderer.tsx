import React, { useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  DEFAULT_GALLERY_SIZE,
  DEFAULT_GALLERY_STRIP_GAP,
  DEFAULT_GALLERY_STRIP_HEIGHT,
  DEFAULT_GALLERY_STYLE,
  getGalleryScale,
  normalizeGallerySize,
  normalizeGalleryStripGap,
  normalizeGalleryStripHeight,
  normalizeGalleryStyle,
  type GalleryStyle,
} from "../editor/nodes/GalleryNode";

import ArticleGallery from "./ArticleGallery";

type GalleryImage = {
  altText: string;
  src: string;
};

interface ArticleHtmlRendererProps {
  htmlContent: string;
}

function getGalleryPayload(galleryElement: HTMLElement): {
  images: Array<{ src: string; altText: string }>;
  activeIndex: number;
  style: GalleryStyle;
  size: number;
  stripGap: number;
  stripHeight: number;
} | null {
  const rawPayload = galleryElement.getAttribute("data-lexical-gallery");
  if (rawPayload) {
    try {
      const parsed = JSON.parse(rawPayload) as {
        images?: Array<{ src?: string; altText?: string }>;
        activeIndex?: number;
        style?: GalleryStyle;
        size?: number;
        stripGap?: number;
        stripHeight?: number;
      };
      if (Array.isArray(parsed.images)) {
        const normalized = parsed.images
          .map((image) => {
            if (!image || typeof image.src !== "string" || !image.src.trim()) {
              return null;
            }
            return {
              src: image.src.trim(),
              altText: typeof image.altText === "string" ? image.altText : "",
            };
          })
          .filter(
            (image): image is { src: string; altText: string } => Boolean(image),
          );

        const maxIndex = Math.max(0, normalized.length - 1);
        const safeActiveIndex =
          typeof parsed.activeIndex === "number"
            ? Math.max(0, Math.min(Math.floor(parsed.activeIndex), maxIndex))
            : 0;

        return {
          images: normalized,
          activeIndex: safeActiveIndex,
          style: normalizeGalleryStyle(
            parsed.style ?? galleryElement.getAttribute("data-gallery-style"),
          ),
          size: normalizeGallerySize(
            parsed.size ?? galleryElement.getAttribute("data-gallery-size"),
          ),
          stripGap: normalizeGalleryStripGap(
            parsed.stripGap ??
              galleryElement.getAttribute("data-gallery-strip-gap"),
          ),
          stripHeight: normalizeGalleryStripHeight(
            parsed.stripHeight ??
              galleryElement.getAttribute("data-gallery-strip-height"),
          ),
        };
      }
    } catch {
      return null;
    }
  }

  const fallbackImages = Array.from(
    galleryElement.querySelectorAll<HTMLImageElement>(".GalleryNode__thumbnail"),
  )
    .map((image) => ({
      src: image.src,
      altText: image.getAttribute("alt") || "",
    }))
    .filter((image) => image.src);

  if (fallbackImages.length > 0) {
    return {
      images: fallbackImages,
      activeIndex: 0,
      style: DEFAULT_GALLERY_STYLE,
      size: DEFAULT_GALLERY_SIZE,
      stripGap: DEFAULT_GALLERY_STRIP_GAP,
      stripHeight: DEFAULT_GALLERY_STRIP_HEIGHT,
    };
  }

  const fallbackMain = galleryElement.querySelector<HTMLImageElement>("img");
  if (!fallbackMain) {
    return null;
  }

  return {
    images: [{ src: fallbackMain.src, altText: fallbackMain.alt || "" }],
    activeIndex: 0,
    style: DEFAULT_GALLERY_STYLE,
    size: DEFAULT_GALLERY_SIZE,
    stripGap: DEFAULT_GALLERY_STRIP_GAP,
    stripHeight: DEFAULT_GALLERY_STRIP_HEIGHT,
  };
}

const ArticleHtmlRenderer: React.FC<ArticleHtmlRendererProps> = ({ htmlContent }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !htmlContent) {
      return;
    }

    const galleryRoots: Root[] = [];
    const galleries = Array.from(
      container.querySelectorAll<HTMLElement>(
        "figure[data-lexical-gallery], .GalleryNode__container",
      ),
    );

    galleries.forEach((galleryElement) => {
      const payload = getGalleryPayload(galleryElement);
      if (!payload || payload.images.length === 0) {
        return;
      }

      const currentActiveIndex = Number.parseInt(
        galleryElement.getAttribute("data-active-index") || String(payload.activeIndex),
        10,
      );
      const activeIndex = Math.max(
        0,
        Math.min(
          Number.isNaN(currentActiveIndex) ? payload.activeIndex : currentActiveIndex,
          payload.images.length - 1,
        ),
      );

      galleryElement.classList.add("GalleryNode__container");
      galleryElement.setAttribute("aria-label", "Image gallery");
      galleryElement.setAttribute("data-active-index", String(activeIndex));
      galleryElement.setAttribute("data-gallery-style", payload.style);
      galleryElement.setAttribute("data-gallery-size", String(payload.size));
      galleryElement.setAttribute(
        "data-gallery-strip-gap",
        String(payload.stripGap),
      );
      galleryElement.setAttribute(
        "data-gallery-strip-height",
        String(payload.stripHeight),
      );
      galleryElement.style.setProperty(
        "--gallery-scale",
        String(getGalleryScale(payload.size)),
      );
      galleryElement.style.setProperty(
        "--gallery-strip-gap",
        `${payload.stripGap}px`,
      );
      galleryElement.style.setProperty(
        "--gallery-strip-image-height",
        `${payload.stripHeight}px`,
      );
      galleryElement.style.width = `min(${payload.size}%, calc(100vw - 32px))`;
      galleryElement.style.maxWidth = "none";
      galleryElement.style.position = "relative";
      galleryElement.style.left = "50%";
      galleryElement.style.transform = "translateX(-50%)";

      const root = createRoot(galleryElement);
      root.render(
        <ArticleGallery
          images={payload.images as GalleryImage[]}
          initialActiveIndex={activeIndex}
          style={payload.style}
          size={payload.size}
          stripGap={payload.stripGap}
          stripHeight={payload.stripHeight}
        />,
      );
      galleryRoots.push(root);
    });

    return () => {
      galleryRoots.forEach((root) => root.unmount());
    };
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      className="article-html-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default React.memo(ArticleHtmlRenderer);
