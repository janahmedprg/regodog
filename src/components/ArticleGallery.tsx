import React, { useEffect, useRef, useState } from "react";

type GalleryImage = {
  altText: string;
  src: string;
};

interface ArticleGalleryProps {
  images: GalleryImage[];
  initialActiveIndex?: number;
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
}) => {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(
    clampIndex(initialActiveIndex, images.length),
  );
  const normalizedActiveIndex = clampIndex(activeIndex, images.length);

  useEffect(() => {
    const strip = stripRef.current;
    const activeButton = strip?.querySelector<HTMLButtonElement>(
      `[data-gallery-thumb-index="${normalizedActiveIndex}"]`,
    );

    activeButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [normalizedActiveIndex]);

  if (images.length === 0) {
    return <div className="GalleryNode__empty">No images in gallery.</div>;
  }

  const currentImage = images[normalizedActiveIndex] || images[0];

  return (
    <>
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
          onClick={() => {
            const strip = stripRef.current;
            if (!strip) {
              return;
            }
            strip.scrollBy({ left: -(strip.clientWidth || 160), behavior: "smooth" });
          }}
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
          onClick={() => {
            const strip = stripRef.current;
            if (!strip) {
              return;
            }
            strip.scrollBy({ left: strip.clientWidth || 160, behavior: "smooth" });
          }}
          aria-label="Scroll thumbnails right"
        >
          →
        </button>
      </div>
    </>
  );
};

export default ArticleGallery;
