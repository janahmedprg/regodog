import React, { useEffect, useRef, useState } from "react";
import {
  DEFAULT_GALLERY_SIZE,
  DEFAULT_GALLERY_STYLE,
  type GalleryStyle,
  GALLERY_STYLES,
  normalizeGallerySize,
  normalizeGalleryStyle,
} from "../editor/nodes/GalleryNode";

type GalleryImage = {
  altText: string;
  src: string;
};

interface ArticleGalleryProps {
  images: GalleryImage[];
  initialActiveIndex?: number;
  style?: GalleryStyle;
  size?: number;
}

function clampIndex(index: number, imageCount: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(index), Math.max(0, imageCount - 1)));
}

const ArticleGallery: React.FC<ArticleGalleryProps> = ({
  images,
  initialActiveIndex = 0,
  style = DEFAULT_GALLERY_STYLE,
  size = DEFAULT_GALLERY_SIZE,
}) => {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    clampIndex(initialActiveIndex, images.length),
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const galleryStyle = normalizeGalleryStyle(style);
  const gallerySize = normalizeGallerySize(size);
  const normalizedActiveIndex = clampIndex(activeIndex, images.length);

  useEffect(() => {
    if (galleryStyle !== GALLERY_STYLES.DEFAULT) {
      return;
    }
    const strip = stripRef.current;
    const activeButton = strip?.querySelector<HTMLButtonElement>(
      `[data-gallery-thumb-index="${normalizedActiveIndex}"]`,
    );

    activeButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [galleryStyle, normalizedActiveIndex]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const refresh = () => {
      setCanScrollLeft(strip.scrollLeft > 0);
      setCanScrollRight(
        strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2,
      );
    };

    refresh();
    strip.addEventListener("scroll", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      strip.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, [galleryStyle, images.length]);

  if (images.length === 0) {
    return <div className="GalleryNode__empty">No images in gallery.</div>;
  }

  const currentImage = images[normalizedActiveIndex] || images[0];
  const scroll = (direction: "left" | "right") => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const offset = direction === "left" ? -(strip.clientWidth || 192) : strip.clientWidth || 192;
    strip.scrollBy({ left: offset, behavior: "smooth" });
  };

  const moveActiveImage = (direction: "left" | "right") => {
    setActiveIndex((prev) =>
      direction === "left"
        ? Math.max(0, prev - 1)
        : Math.min(images.length - 1, prev + 1),
    );
  };

  if (galleryStyle === GALLERY_STYLES.STRIP) {
    return (
      <div
        className="GalleryNode__carousel"
        style={{
          width: `${gallerySize}%`,
          maxWidth: "100%",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <button
          type="button"
          className="GalleryNode__arrow"
          data-direction="left"
          disabled={!canScrollLeft}
          onClick={() => scroll("left")}
          aria-label="Scroll gallery left"
        >
          ←
        </button>
        <div className="GalleryNode__carouselViewport" ref={stripRef}>
          <div className="GalleryNode__carouselTrack">
            {images.map((image, index) => (
              <img
                key={`${image.src}-${index}`}
                className="GalleryNode__carouselImage"
                src={image.src}
                alt={image.altText || `Gallery image ${index + 1}`}
                loading="lazy"
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="GalleryNode__arrow"
          data-direction="right"
          disabled={!canScrollRight}
          onClick={() => scroll("right")}
          aria-label="Scroll gallery right"
        >
          →
        </button>
      </div>
    );
  }

  if (galleryStyle === GALLERY_STYLES.SLIDESHOW) {
    return (
      <div
        className="GalleryNode__slideshow"
        style={{
          width: `${gallerySize}%`,
          maxWidth: "100%",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <button
          type="button"
          className="GalleryNode__arrow GalleryNode__slideshowArrow"
          data-direction="left"
          disabled={normalizedActiveIndex === 0}
          onClick={() => moveActiveImage("left")}
          aria-label="Show previous image"
        >
          ←
        </button>
        <div className="GalleryNode__main">
          <img
            className="GalleryNode__mainImage"
            src={currentImage.src}
            alt={currentImage.altText || `Gallery image ${normalizedActiveIndex + 1}`}
            loading="lazy"
          />
        </div>
        <button
          type="button"
          className="GalleryNode__arrow GalleryNode__slideshowArrow"
          data-direction="right"
          disabled={normalizedActiveIndex === images.length - 1}
          onClick={() => moveActiveImage("right")}
          aria-label="Show next image"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${gallerySize}%`,
        maxWidth: "100%",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div className="GalleryNode__main">
        <img
          className="GalleryNode__mainImage"
          src={currentImage.src}
          alt={currentImage.altText || `Gallery image ${normalizedActiveIndex + 1}`}
          loading="lazy"
        />
      </div>
      <div className="GalleryNode__thumbnails">
        <button
          type="button"
          className="GalleryNode__arrow"
          data-direction="left"
          disabled={!canScrollLeft}
          onClick={() => scroll("left")}
          aria-label="Scroll thumbnails left"
        >
          ←
        </button>
        <div className="GalleryNode__thumbStrip" ref={stripRef}>
          {images.map((image, index) => {
            const isActive = index === normalizedActiveIndex;

            return (
              <button
                key={`${image.src}-${index}`}
                type="button"
                className={`GalleryNode__thumbButton${
                  isActive ? " GalleryNode__thumbButtonActive" : ""
                }`}
                data-gallery-thumb-index={index}
                onClick={() => setActiveIndex(index)}
                aria-label={`Select image ${index + 1}`}
              >
                <img
                  className="GalleryNode__thumbnail"
                  src={image.src}
                  alt={image.altText || `Gallery thumbnail ${index + 1}`}
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="GalleryNode__arrow"
          data-direction="right"
          disabled={!canScrollRight}
          onClick={() => scroll("right")}
          aria-label="Scroll thumbnails right"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default ArticleGallery;
