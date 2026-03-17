/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './GalleryNode.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  type NodeKey,
} from 'lexical';
import {type RefObject, useCallback, useEffect, useRef, useState} from 'react';

import useModal from '../hooks/useModal';
import InsertGalleryDialog from '../ui/GalleryInsertDialog';
import joinClasses from '../utils/joinClasses';
import {
  $createGalleryNode,
  DEFAULT_GALLERY_SIZE,
  $isGalleryNode,
  DEFAULT_GALLERY_STYLE,
  GalleryImage,
  GalleryStyle,
  getGalleryScale,
  GALLERY_STYLES,
  normalizeGallerySize,
  normalizeGalleryStripGap,
  normalizeGalleryStripHeight,
  normalizeGalleryStyle,
} from './GalleryNode';
import type {CSSProperties} from 'react';

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function useGalleryScrollState(containerRef: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refresh = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 2,
    );
  }, [containerRef]);

  useEffect(() => {
    refresh();
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('scroll', refresh);
    window.addEventListener('resize', refresh);

    return () => {
      container.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [refresh, containerRef]);

  return {
    canScrollLeft,
    canScrollRight,
    refresh,
  };
}

function getGallerySizingStyle(gallerySize: number) {
  return {
    '--gallery-scale': String(getGalleryScale(gallerySize)),
    width: `min(${gallerySize}%, calc(100vw - 32px))`,
    maxWidth: 'none',
    position: 'relative' as const,
    left: '50%',
    transform: 'translateX(-50%)',
  };
}

function getGalleryStripStyle(stripGap: number, stripHeight: number) {
  return {
    '--gallery-strip-gap': `${normalizeGalleryStripGap(stripGap)}px`,
    '--gallery-strip-image-height': `${normalizeGalleryStripHeight(stripHeight)}px`,
  } as CSSProperties;
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
            className={joinClasses(
              'GalleryNode__slideshowDot',
              isActive && 'GalleryNode__slideshowDotActive',
            )}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Show image ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
          />
        );
      })}
    </div>
  );
}

export default function GalleryComponent({
  images,
  activeIndex,
  style,
  size,
  stripGap,
  stripHeight,
  nodeKey,
}: {
  activeIndex: number;
  images: GalleryImage[];
  style: GalleryStyle;
  size: number;
  stripGap: number;
  stripHeight: number;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [modal, showModal] = useModal();

  const normalizedActiveIndex = clamp(
    activeIndex,
    0,
    Math.max(0, images.length - 1),
  );
  const galleryStyle = normalizeGalleryStyle(style ?? DEFAULT_GALLERY_STYLE);
  const gallerySize = normalizeGallerySize(size ?? DEFAULT_GALLERY_SIZE);
  const gallerySizingStyle = getGallerySizingStyle(gallerySize);
  const galleryStripStyle = getGalleryStripStyle(stripGap, stripHeight);
  const currentImage = images[normalizedActiveIndex];

  const {canScrollLeft, canScrollRight, refresh} =
    useGalleryScrollState(stripRef);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          const target = event.target as Node;

          if (!containerRef.current || !containerRef.current.contains(target)) {
            return false;
          }

          if (!event.shiftKey) {
            clearSelection();
          }
          setSelected(!isSelected);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, containerRef, editor, isSelected, setSelected]);

  useEffect(() => {
    refresh();
  }, [images.length, refresh]);

  const activateImage = (nextIndex: number) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isGalleryNode(node)) {
        node.setActiveIndex(nextIndex);
      }
    });
  };

  const replaceGallery = ({
    images: nextImages,
    style: nextStyle,
    size: nextSize,
    stripGap: nextStripGap,
    stripHeight: nextStripHeight,
  }: {
    images: GalleryImage[];
    style: GalleryStyle;
    size: number;
    stripGap: number;
    stripHeight: number;
  }) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isGalleryNode(node)) {
        return;
      }
      const activeGalleryIndex = node.getActiveIndex();
      node.replace(
        $createGalleryNode(
          nextImages,
          activeGalleryIndex,
          nextStyle,
          nextSize,
          nextStripGap,
          nextStripHeight,
        ),
      );
    });
  };

  const scroll = (direction: 'left' | 'right') => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const offset =
      direction === 'left'
        ? -(strip.clientWidth || 192)
        : strip.clientWidth || 192;
    strip.scrollBy({left: offset, behavior: 'smooth'});
  };

  const moveActiveImage = (direction: 'left' | 'right') => {
    if (images.length === 0) {
      return;
    }
    const nextIndex =
      direction === 'left'
        ? (normalizedActiveIndex - 1 + images.length) % images.length
        : (normalizedActiveIndex + 1) % images.length;
    activateImage(nextIndex);
  };

  if (images.length === 0) {
    return <div className="GalleryNode__empty">No images in gallery.</div>;
  }

  return (
    <div
      className={joinClasses(
        'GalleryNode__container',
        galleryStyle === GALLERY_STYLES.STRIP && 'GalleryNode__container--strip',
        galleryStyle === GALLERY_STYLES.SLIDESHOW &&
          'GalleryNode__container--slideshow',
        isSelected ? 'focused' : '',
      )}
      data-gallery-style={galleryStyle}
      data-gallery-size={gallerySize}
      style={gallerySizingStyle}
      ref={containerRef}
    >
      {galleryStyle === GALLERY_STYLES.STRIP ? (
        <div className="GalleryNode__carousel">
          <button
            className="GalleryNode__arrow"
            data-direction="left"
            disabled={!canScrollLeft}
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll gallery left"
          >
            ‹
          </button>
          <div className="GalleryNode__carouselViewport" ref={stripRef}>
            <div className="GalleryNode__carouselTrack" style={galleryStripStyle}>
              {images.map((image, index) => (
                <img
                  key={`${image.src}-${index}`}
                  className="GalleryNode__carouselImage"
                  src={image.src}
                  alt={image.altText || `Gallery image ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <button
            className="GalleryNode__arrow"
            data-direction="right"
            disabled={!canScrollRight}
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll gallery right"
          >
            ›
          </button>
        </div>
      ) : galleryStyle === GALLERY_STYLES.SLIDESHOW ? (
        <div>
          <div className="GalleryNode__slideshow">
            <button
              className="GalleryNode__arrow GalleryNode__slideshowArrow"
              data-direction="left"
              type="button"
              onClick={() => moveActiveImage('left')}
              aria-label="Show previous image"
            >
              ‹
            </button>
            <div className="GalleryNode__main">
              <img
                className="GalleryNode__mainImage"
                src={currentImage.src}
                alt={currentImage.altText || `Gallery image ${normalizedActiveIndex + 1}`}
              />
            </div>
            <button
              className="GalleryNode__arrow GalleryNode__slideshowArrow"
              data-direction="right"
              type="button"
              onClick={() => moveActiveImage('right')}
              aria-label="Show next image"
            >
              ›
            </button>
          </div>
          {renderSlideshowDots(images, normalizedActiveIndex, activateImage)}
        </div>
      ) : (
        <>
          <div className="GalleryNode__main">
            <img
              className="GalleryNode__mainImage"
              src={currentImage.src}
              alt={currentImage.altText || `Gallery image ${normalizedActiveIndex + 1}`}
            />
          </div>
          <div className="GalleryNode__thumbnails">
            <button
              className="GalleryNode__arrow"
              data-direction="left"
              disabled={!canScrollLeft}
              type="button"
              onClick={() => scroll('left')}
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
                    className={joinClasses(
                      'GalleryNode__thumbButton',
                      isActive && 'GalleryNode__thumbButtonActive',
                    )}
                    type="button"
                    onClick={() => {
                      activateImage(index);
                    }}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <img
                      className="GalleryNode__thumbnail"
                      src={image.src}
                      alt={image.altText || `Gallery thumbnail ${index + 1}`}
                    />
                  </button>
                );
              })}
            </div>
            <button
              className="GalleryNode__arrow"
              data-direction="right"
              disabled={!canScrollRight}
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll thumbnails right"
            >
              ›
            </button>
          </div>
        </>
      )}
      <div className="GalleryNode__editActions">
        <button
          className="GalleryNode__editButton"
          onClick={() => {
            showModal('Edit Gallery', (onClose) => (
              <InsertGalleryDialog
                activeEditor={editor}
                onClose={onClose}
                initialImages={images}
                initialStyle={galleryStyle}
                initialSize={gallerySize}
                initialStripGap={normalizeGalleryStripGap(stripGap)}
                initialStripHeight={normalizeGalleryStripHeight(stripHeight)}
                submitButtonText="Update Gallery"
                onSubmit={replaceGallery}
              />
            ));
          }}
          type="button"
        >
          Edit gallery
        </button>
      </div>
      {modal}
    </div>
  );
}
