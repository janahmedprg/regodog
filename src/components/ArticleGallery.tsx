import React, { useEffect, useRef, useState } from "react";
import "../editor/nodes/GalleryNode.css";
import {
  DEFAULT_GALLERY_SIZE,
  DEFAULT_GALLERY_STRIP_GAP,
  DEFAULT_GALLERY_STRIP_HEIGHT,
  DEFAULT_GALLERY_STYLE,
  type GalleryStyle,
  GALLERY_STYLES,
  normalizeGallerySize,
  normalizeGalleryStripGap,
  normalizeGalleryStripHeight,
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
  stripGap?: number;
  stripHeight?: number;
}

function clampIndex(index: number, imageCount: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(index), Math.max(0, imageCount - 1)));
}

function renderSlideshowDots(
  images: GalleryImage[],
  activeIndex: number,
  onSelect: (index: number) => void,
) {
  return (
    <div className="GalleryNode__slideshowDots" aria-label="Slideshow position">
      {images.map((image, index) => {
        const isActive = index === activeIndex;

        return (
          <button
            key={`${image.src}-${index}-dot`}
            type="button"
            className={`GalleryNode__slideshowDot${
              isActive ? " GalleryNode__slideshowDotActive" : ""
            }`}
            onClick={() => onSelect(index)}
            aria-label={`Show image ${index + 1}`}
            aria-current={isActive ? "true" : undefined}
          />
        );
      })}
    </div>
  );
}

const ArticleGallery: React.FC<ArticleGalleryProps> = ({
  images,
  initialActiveIndex = 0,
  style = DEFAULT_GALLERY_STYLE,
  size = DEFAULT_GALLERY_SIZE,
  stripGap = DEFAULT_GALLERY_STRIP_GAP,
  stripHeight = DEFAULT_GALLERY_STRIP_HEIGHT,
}) => {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    clampIndex(initialActiveIndex, images.length),
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const galleryStyle = normalizeGalleryStyle(style);
  const gallerySize = normalizeGallerySize(size);
  const normalizedStripGap = normalizeGalleryStripGap(stripGap);
  const normalizedStripHeight = normalizeGalleryStripHeight(stripHeight);
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
        ? (prev - 1 + images.length) % images.length
        : (prev + 1) % images.length,
    );
  };

  if (galleryStyle === GALLERY_STYLES.STRIP) {
    return (
      <div className="GalleryNode__carousel">
        <button
          type="button"
          className="GalleryNode__arrow"
          data-direction="left"
          disabled={!canScrollLeft}
          onClick={() => scroll("left")}
          aria-label="Scroll gallery left"
        >
          ‹
        </button>
        <div className="GalleryNode__carouselViewport" ref={stripRef}>
          <div
            className="GalleryNode__carouselTrack"
            style={{
              "--gallery-strip-gap": `${normalizedStripGap}px`,
              "--gallery-strip-image-height": `${normalizedStripHeight}px`,
            } as React.CSSProperties}
          >
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
          ›
        </button>
      </div>
    );
  }

  if (galleryStyle === GALLERY_STYLES.SLIDESHOW) {
    return (
      <div>
        <div className="GalleryNode__slideshow">
          <button
            type="button"
            className="GalleryNode__arrow GalleryNode__slideshowArrow"
            data-direction="left"
            onClick={() => moveActiveImage("left")}
            aria-label="Show previous image"
          >
            ‹
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
            onClick={() => moveActiveImage("right")}
            aria-label="Show next image"
          >
            ›
          </button>
        </div>
        {renderSlideshowDots(images, normalizedActiveIndex, setActiveIndex)}
      </div>
    );
  }

  return (
    <div>
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
          ‹
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
          ›
        </button>
      </div>
    </div>
  );
};

export default ArticleGallery;
