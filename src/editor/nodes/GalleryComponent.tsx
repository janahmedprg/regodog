/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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

import joinClasses from '../utils/joinClasses';
import {$isGalleryNode, GalleryImage} from './GalleryNode';

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

export default function GalleryComponent({
  images,
  activeIndex,
  nodeKey,
}: {
  activeIndex: number;
  images: GalleryImage[];
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const normalizedActiveIndex = clamp(
    activeIndex,
    0,
    Math.max(0, images.length - 1),
  );
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

  const scroll = (direction: 'left' | 'right') => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const offset = direction === 'left' ? -160 : 160;
    strip.scrollBy({left: offset, behavior: 'smooth'});
  };

  if (images.length === 0) {
    return <div className="GalleryNode__empty">No images in gallery.</div>;
  }

  return (
    <div
      className={joinClasses(
        'GalleryNode__container',
        isSelected ? 'focused' : '',
      )}
      ref={containerRef}
    >
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
          disabled={!canScrollLeft}
          type="button"
          onClick={() => scroll('left')}
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
          disabled={!canScrollRight}
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll thumbnails right"
        >
          →
        </button>
      </div>
    </div>
  );
}
