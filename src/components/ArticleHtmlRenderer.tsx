import React, { useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";

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
} | null {
  const rawPayload = galleryElement.getAttribute("data-lexical-gallery");
  if (rawPayload) {
    try {
      const parsed = JSON.parse(rawPayload) as {
        images?: Array<{ src?: string; altText?: string }>;
        activeIndex?: number;
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

        return { images: normalized, activeIndex: safeActiveIndex };
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
    return { images: fallbackImages, activeIndex: 0 };
  }

  const fallbackMain = galleryElement.querySelector<HTMLImageElement>("img");
  if (!fallbackMain) {
    return null;
  }

  return {
    images: [{ src: fallbackMain.src, altText: fallbackMain.alt || "" }],
    activeIndex: 0,
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

      const root = createRoot(galleryElement);
      root.render(
        <ArticleGallery
          images={payload.images as GalleryImage[]}
          initialActiveIndex={activeIndex}
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
