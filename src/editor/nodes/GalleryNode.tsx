/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversion,
  DOMConversionOutput,
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  SerializedLexicalNode,
  Spread,
  NodeKey,
} from 'lexical';
import type {JSX} from 'react';

import {DecoratorNode} from 'lexical';
import * as React from 'react';

const GalleryComponent = React.lazy(() => import('./GalleryComponent'));

export type GalleryImage = {
  altText: string;
  src: string;
};

export type GalleryPayload = {
  images: ReadonlyArray<GalleryImage>;
  initialActiveIndex?: number;
};

export type SerializedGalleryNode = Spread<
  {
    images: GalleryImage[];
    activeIndex: number;
  },
  SerializedLexicalNode
>;

function isGalleryImage(value: unknown): value is GalleryImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'src' in value &&
    typeof (value as {src: unknown}).src === 'string' &&
    (value as {src: string}).src.trim() !== ''
  );
}

function normalizeImages(images: ReadonlyArray<GalleryImage>): GalleryImage[] {
  return images
    .map((image) => {
      if (isGalleryImage(image)) {
        return {
          src: image.src.trim(),
          altText: image.altText ? image.altText.trim() : '',
        };
      }
      return null;
    })
    .filter((image): image is GalleryImage => image !== null);
}

function normalizeActiveIndex(index: number | undefined, count: number): number {
  const maxIndex = Math.max(0, count - 1);
  if (!Number.isFinite(index ?? NaN)) {
    return 0;
  }
  const normalized = Math.round(index ?? 0);
  if (normalized < 0) {
    return 0;
  }
  if (normalized > maxIndex) {
    return maxIndex;
  }
  return normalized;
}

function $convertGalleryElement(domNode: HTMLDivElement): DOMConversionOutput | null {
  const data = domNode.getAttribute('data-lexical-gallery');
  if (!data) {
    return null;
  }

  try {
    const payload = JSON.parse(data) as {images: GalleryImage[]; activeIndex?: number};
    if (Array.isArray(payload.images)) {
      return {
        node: $createGalleryNode(payload.images, payload.activeIndex),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export class GalleryNode extends DecoratorNode<JSX.Element> {
  __images: GalleryImage[];
  __activeIndex: number;

  static getType(): string {
    return 'gallery';
  }

  static clone(node: GalleryNode): GalleryNode {
    return new GalleryNode(node.__images, node.__activeIndex, node.__key);
  }

  static importJSON(serializedNode: SerializedGalleryNode): GalleryNode {
    return $createGalleryNode(
      normalizeImages(serializedNode.images || []),
      serializedNode.activeIndex,
    );
  }

  static importDOM(): DOMConversionMap {
    return {
      figure: (domNode: HTMLDivElement) => ({
        conversion: $convertGalleryElement,
        priority: 2 as DOMConversion['priority'],
      }),
      div: (domNode: HTMLDivElement) => {
        if (domNode.getAttribute('data-lexical-gallery')) {
          return {
            conversion: $convertGalleryElement,
            priority: 2 as DOMConversion['priority'],
          };
        }
        return null;
      },
    };
  }

  constructor(
    images?: ReadonlyArray<GalleryImage>,
    activeIndex = 0,
    key?: NodeKey,
  ) {
    super(key);
    this.__images = normalizeImages(images && images.length > 0 ? images : []);
    this.__activeIndex = normalizeActiveIndex(activeIndex, this.__images.length);
  }

  exportJSON(): SerializedGalleryNode {
    return {
      ...super.exportJSON(),
      images: this.__images,
      activeIndex: this.__activeIndex,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('figure');
    const activeIndex = Math.max(
      0,
      Math.min(this.__activeIndex, Math.max(0, this.__images.length - 1)),
    );
    element.setAttribute(
      'data-lexical-gallery',
      JSON.stringify({images: this.__images, activeIndex: this.__activeIndex}),
    );
    element.className = 'GalleryNode__container';
    element.setAttribute('aria-label', 'Image gallery');
    element.setAttribute('data-active-index', String(activeIndex));

    const mainWrap = document.createElement('div');
    mainWrap.className = 'GalleryNode__main';
    element.append(mainWrap);

    if (this.__images.length > 0) {
      const image = this.__images[activeIndex];
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = image.altText || `Gallery image ${activeIndex + 1}`;
      img.className = 'GalleryNode__mainImage';
      img.loading = 'lazy';
      mainWrap.append(img);

      const thumbs = document.createElement('div');
      thumbs.className = 'GalleryNode__thumbnails';

      const leftArrow = document.createElement('button');
      leftArrow.type = 'button';
      leftArrow.className = 'GalleryNode__arrow';
      leftArrow.setAttribute('data-gallery-nav', 'left');
      leftArrow.setAttribute('aria-label', 'Scroll thumbnails left');
      leftArrow.textContent = '←';
      thumbs.append(leftArrow);

      const strip = document.createElement('div');
      strip.className = 'GalleryNode__thumbStrip';
      this.__images.forEach((galleryImage, index) => {
      const button = document.createElement('button');
        button.type = 'button';
        button.className = 'GalleryNode__thumbButton';
        if (index === activeIndex) {
          button.classList.add('GalleryNode__thumbButtonActive');
        }
        button.setAttribute('data-gallery-thumb-index', String(index));
        button.setAttribute('data-gallery-thumb-src', galleryImage.src);
        button.setAttribute(
          'data-gallery-thumb-alt',
          galleryImage.altText || `Gallery thumbnail ${index + 1}`,
        );
        button.setAttribute('aria-label', `Select image ${index + 1}`);
        const thumb = document.createElement('img');
        thumb.src = galleryImage.src;
        thumb.alt = galleryImage.altText || `Gallery thumbnail ${index + 1}`;
        thumb.className = 'GalleryNode__thumbnail';
        thumb.loading = 'lazy';
        button.append(thumb);
        strip.append(button);
      });
      thumbs.append(strip);

      const rightArrow = document.createElement('button');
      rightArrow.className = 'GalleryNode__arrow';
      rightArrow.setAttribute('data-gallery-nav', 'right');
      rightArrow.setAttribute('aria-label', 'Scroll thumbnails right');
      rightArrow.textContent = '→';
      thumbs.append(rightArrow);

      element.append(thumbs);
    }

    if (this.__images.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'GalleryNode__empty';
      empty.textContent = 'No images in gallery.';
      element.append(empty);
    }

    return {element};
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }

  getImages(): GalleryImage[] {
    return this.__images;
  }

  getActiveIndex(): number {
    return this.__activeIndex;
  }

  setActiveIndex(nextActiveIndex: number): void {
    const writable = this.getWritable();
    writable.__activeIndex = normalizeActiveIndex(
      nextActiveIndex,
      writable.__images.length,
    );
  }

  decorate(): JSX.Element {
    return (
      <GalleryComponent
        images={this.getImages()}
        activeIndex={this.getActiveIndex()}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createGalleryNode(
  images: ReadonlyArray<GalleryImage>,
  initialActiveIndex?: number,
): GalleryNode {
  return new GalleryNode(images, initialActiveIndex);
}

export function $isGalleryNode(
  node: LexicalNode | null | undefined,
): node is GalleryNode {
  return node instanceof GalleryNode;
}
