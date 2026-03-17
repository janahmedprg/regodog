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

export const GALLERY_STYLES = {
  DEFAULT: 'default',
  STRIP: 'strip',
  SLIDESHOW: 'slideshow',
} as const;

export const MIN_GALLERY_SIZE = 25;
export const MAX_GALLERY_SIZE = 160;
export const DEFAULT_GALLERY_STRIP_GAP = 12;
export const MIN_GALLERY_STRIP_GAP = 0;
export const MAX_GALLERY_STRIP_GAP = 48;
export const DEFAULT_GALLERY_STRIP_HEIGHT = 220;
export const MIN_GALLERY_STRIP_HEIGHT = 120;
export const MAX_GALLERY_STRIP_HEIGHT = 420;

export type GalleryStyle =
  (typeof GALLERY_STYLES)[keyof typeof GALLERY_STYLES];

export const DEFAULT_GALLERY_STYLE: GalleryStyle = GALLERY_STYLES.DEFAULT;
export const DEFAULT_GALLERY_SIZE = 100;

export type GalleryPayload = {
  images: ReadonlyArray<GalleryImage>;
  initialActiveIndex?: number;
  style?: GalleryStyle;
  size?: number;
  stripGap?: number;
  stripHeight?: number;
};

export type SerializedGalleryNode = Spread<
  {
    images: GalleryImage[];
    activeIndex: number;
    style?: GalleryStyle;
    size?: number;
    stripGap?: number;
    stripHeight?: number;
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

export function normalizeGalleryStyle(style: unknown): GalleryStyle {
  switch (style) {
    case GALLERY_STYLES.STRIP:
    case GALLERY_STYLES.SLIDESHOW:
    case GALLERY_STYLES.DEFAULT:
      return style;
    default:
      return DEFAULT_GALLERY_STYLE;
  }
}

export function normalizeGallerySize(size: unknown): number {
  const parsed =
    typeof size === 'number'
      ? size
      : typeof size === 'string'
        ? Number.parseFloat(size)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_GALLERY_SIZE;
  }

  return Math.max(MIN_GALLERY_SIZE, Math.min(MAX_GALLERY_SIZE, Math.round(parsed)));
}

export function getGalleryScale(size: unknown): number {
  const normalizedSize = normalizeGallerySize(size);

  return Math.max(0.6, Math.min(normalizedSize / 100, 1.6));
}

export function normalizeGalleryStripGap(gap: unknown): number {
  const parsed =
    typeof gap === 'number'
      ? gap
      : typeof gap === 'string'
        ? Number.parseFloat(gap)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_GALLERY_STRIP_GAP;
  }

  return Math.max(
    MIN_GALLERY_STRIP_GAP,
    Math.min(MAX_GALLERY_STRIP_GAP, Math.round(parsed)),
  );
}

export function normalizeGalleryStripHeight(height: unknown): number {
  const parsed =
    typeof height === 'number'
      ? height
      : typeof height === 'string'
        ? Number.parseFloat(height)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_GALLERY_STRIP_HEIGHT;
  }

  return Math.max(
    MIN_GALLERY_STRIP_HEIGHT,
    Math.min(MAX_GALLERY_STRIP_HEIGHT, Math.round(parsed)),
  );
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
    const payload = JSON.parse(data) as {
      images: GalleryImage[];
      activeIndex?: number;
      style?: GalleryStyle;
      size?: number;
      stripGap?: number;
      stripHeight?: number;
    };
    if (Array.isArray(payload.images)) {
      return {
        node: $createGalleryNode(
          payload.images,
          payload.activeIndex,
          normalizeGalleryStyle(
            payload.style ?? domNode.getAttribute('data-gallery-style'),
          ),
          normalizeGallerySize(
            payload.size ?? domNode.getAttribute('data-gallery-size'),
          ),
          normalizeGalleryStripGap(
            payload.stripGap ?? domNode.getAttribute('data-gallery-strip-gap'),
          ),
          normalizeGalleryStripHeight(
            payload.stripHeight ??
              domNode.getAttribute('data-gallery-strip-height'),
          ),
        ),
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
  __style: GalleryStyle;
  __size: number;
  __stripGap: number;
  __stripHeight: number;

  static getType(): string {
    return 'gallery';
  }

  static clone(node: GalleryNode): GalleryNode {
    return new GalleryNode(
      node.__images,
      node.__activeIndex,
      node.__style,
      node.__size,
      node.__stripGap,
      node.__stripHeight,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedGalleryNode): GalleryNode {
    return $createGalleryNode(
      normalizeImages(serializedNode.images || []),
      serializedNode.activeIndex,
      serializedNode.style,
      serializedNode.size,
      serializedNode.stripGap,
      serializedNode.stripHeight,
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
    style: GalleryStyle = DEFAULT_GALLERY_STYLE,
    size = DEFAULT_GALLERY_SIZE,
    stripGap = DEFAULT_GALLERY_STRIP_GAP,
    stripHeight = DEFAULT_GALLERY_STRIP_HEIGHT,
    key?: NodeKey,
  ) {
    super(key);
    this.__images = normalizeImages(images && images.length > 0 ? images : []);
    this.__activeIndex = normalizeActiveIndex(activeIndex, this.__images.length);
    this.__style = normalizeGalleryStyle(style);
    this.__size = normalizeGallerySize(size);
    this.__stripGap = normalizeGalleryStripGap(stripGap);
    this.__stripHeight = normalizeGalleryStripHeight(stripHeight);
  }

  exportJSON(): SerializedGalleryNode {
    return {
      ...super.exportJSON(),
      images: this.__images,
      activeIndex: this.__activeIndex,
      style: this.__style,
      size: this.__size,
      stripGap: this.__stripGap,
      stripHeight: this.__stripHeight,
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
      JSON.stringify({
        images: this.__images,
        activeIndex: this.__activeIndex,
        style: this.__style,
        size: this.__size,
        stripGap: this.__stripGap,
        stripHeight: this.__stripHeight,
      }),
    );
    element.className = 'GalleryNode__container';
    if (this.__style === GALLERY_STYLES.STRIP) {
      element.classList.add('GalleryNode__container--strip');
    }
    if (this.__style === GALLERY_STYLES.SLIDESHOW) {
      element.classList.add('GalleryNode__container--slideshow');
    }
    element.setAttribute('aria-label', 'Image gallery');
    element.setAttribute('data-active-index', String(activeIndex));
    element.setAttribute('data-gallery-style', this.__style);
    element.setAttribute('data-gallery-size', String(this.__size));
    element.setAttribute('data-gallery-strip-gap', String(this.__stripGap));
    element.setAttribute('data-gallery-strip-height', String(this.__stripHeight));
    element.style.setProperty('--gallery-scale', String(getGalleryScale(this.__size)));
    element.style.setProperty('--gallery-strip-gap', `${this.__stripGap}px`);
    element.style.setProperty(
      '--gallery-strip-image-height',
      `${this.__stripHeight}px`,
    );
    element.style.width = `min(${this.__size}%, calc(100vw - 32px))`;
    element.style.maxWidth = 'none';
    element.style.position = 'relative';
    element.style.left = '50%';
    element.style.transform = 'translateX(-50%)';

    if (this.__images.length > 0) {
      if (this.__style === GALLERY_STYLES.STRIP) {
        const carousel = document.createElement('div');
        carousel.className = 'GalleryNode__carousel';

        const leftArrow = document.createElement('button');
        leftArrow.type = 'button';
        leftArrow.className = 'GalleryNode__arrow';
        leftArrow.setAttribute('data-gallery-nav', 'left');
        leftArrow.setAttribute('data-direction', 'left');
        leftArrow.setAttribute('aria-label', 'Scroll gallery left');
        leftArrow.textContent = '‹';
        carousel.append(leftArrow);

        const viewport = document.createElement('div');
        viewport.className = 'GalleryNode__carouselViewport';
        const track = document.createElement('div');
        track.className = 'GalleryNode__carouselTrack';
        track.style.setProperty('--gallery-strip-gap', `${this.__stripGap}px`);
        track.style.setProperty(
          '--gallery-strip-image-height',
          `${this.__stripHeight}px`,
        );
        this.__images.forEach((galleryImage, index) => {
          const img = document.createElement('img');
          img.src = galleryImage.src;
          img.alt = galleryImage.altText || `Gallery image ${index + 1}`;
          img.className = 'GalleryNode__carouselImage';
          img.loading = 'lazy';
          track.append(img);
        });
        viewport.append(track);
        carousel.append(viewport);

        const rightArrow = document.createElement('button');
        rightArrow.type = 'button';
        rightArrow.className = 'GalleryNode__arrow';
        rightArrow.setAttribute('data-gallery-nav', 'right');
        rightArrow.setAttribute('data-direction', 'right');
        rightArrow.setAttribute('aria-label', 'Scroll gallery right');
        rightArrow.textContent = '›';
        carousel.append(rightArrow);

        element.append(carousel);
      } else {
        if (this.__style === GALLERY_STYLES.SLIDESHOW) {
          const mainWrap = document.createElement('div');
          mainWrap.className = 'GalleryNode__main';
          const image = this.__images[activeIndex];
          const img = document.createElement('img');
          img.src = image.src;
          img.alt = image.altText || `Gallery image ${activeIndex + 1}`;
          img.className = 'GalleryNode__mainImage';
          img.loading = 'lazy';
          mainWrap.append(img);

          const slideshow = document.createElement('div');
          slideshow.className = 'GalleryNode__slideshow';

          const leftArrow = document.createElement('button');
          leftArrow.type = 'button';
          leftArrow.className = 'GalleryNode__arrow GalleryNode__slideshowArrow';
          leftArrow.setAttribute('data-gallery-nav', 'left');
          leftArrow.setAttribute('data-direction', 'left');
          leftArrow.setAttribute('aria-label', 'Show previous image');
          leftArrow.textContent = '‹';
          slideshow.append(leftArrow);
          slideshow.append(mainWrap);

          const rightArrow = document.createElement('button');
          rightArrow.type = 'button';
          rightArrow.className = 'GalleryNode__arrow GalleryNode__slideshowArrow';
          rightArrow.setAttribute('data-gallery-nav', 'right');
          rightArrow.setAttribute('data-direction', 'right');
          rightArrow.setAttribute('aria-label', 'Show next image');
          rightArrow.textContent = '›';
          slideshow.append(rightArrow);

          element.append(slideshow);
          const dots = document.createElement('div');
          dots.className = 'GalleryNode__slideshowDots';
          dots.setAttribute('aria-label', 'Slideshow position');
          this.__images.forEach((galleryImage, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'GalleryNode__slideshowDot';
            if (index === activeIndex) {
              dot.classList.add('GalleryNode__slideshowDotActive');
              dot.setAttribute('aria-current', 'true');
            }
            dot.setAttribute('aria-label', `Show image ${index + 1}`);
            dot.setAttribute('data-gallery-thumb-index', String(index));
            dot.setAttribute(
              'data-gallery-thumb-src',
              galleryImage.src,
            );
            dot.setAttribute(
              'data-gallery-thumb-alt',
              galleryImage.altText || `Gallery image ${index + 1}`,
            );
            dots.append(dot);
          });
          element.append(dots);
        } else {
          const mainWrap = document.createElement('div');
          mainWrap.className = 'GalleryNode__main';
          const image = this.__images[activeIndex];
          const img = document.createElement('img');
          img.src = image.src;
          img.alt = image.altText || `Gallery image ${activeIndex + 1}`;
          img.className = 'GalleryNode__mainImage';
          img.loading = 'lazy';
          mainWrap.append(img);

          element.append(mainWrap);

          const thumbs = document.createElement('div');
          thumbs.className = 'GalleryNode__thumbnails';

          const leftArrow = document.createElement('button');
          leftArrow.type = 'button';
          leftArrow.className = 'GalleryNode__arrow';
          leftArrow.setAttribute('data-gallery-nav', 'left');
          leftArrow.setAttribute('data-direction', 'left');
          leftArrow.setAttribute('aria-label', 'Scroll thumbnails left');
          leftArrow.textContent = '‹';
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
          rightArrow.type = 'button';
          rightArrow.className = 'GalleryNode__arrow';
          rightArrow.setAttribute('data-gallery-nav', 'right');
          rightArrow.setAttribute('data-direction', 'right');
          rightArrow.setAttribute('aria-label', 'Scroll thumbnails right');
          rightArrow.textContent = '›';
          thumbs.append(rightArrow);

          element.append(thumbs);
        }
      }
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

  getStyle(): GalleryStyle {
    return this.__style;
  }

  getSize(): number {
    return this.__size;
  }

  getStripGap(): number {
    return this.__stripGap;
  }

  getStripHeight(): number {
    return this.__stripHeight;
  }

  setActiveIndex(nextActiveIndex: number): void {
    const writable = this.getWritable();
    writable.__activeIndex = normalizeActiveIndex(
      nextActiveIndex,
      writable.__images.length,
    );
  }

  setStyle(nextStyle: GalleryStyle): void {
    const writable = this.getWritable();
    writable.__style = normalizeGalleryStyle(nextStyle);
  }

  setSize(nextSize: number): void {
    const writable = this.getWritable();
    writable.__size = normalizeGallerySize(nextSize);
  }

  setStripGap(nextStripGap: number): void {
    const writable = this.getWritable();
    writable.__stripGap = normalizeGalleryStripGap(nextStripGap);
  }

  setStripHeight(nextStripHeight: number): void {
    const writable = this.getWritable();
    writable.__stripHeight = normalizeGalleryStripHeight(nextStripHeight);
  }

  decorate(): JSX.Element {
    return (
      <GalleryComponent
        images={this.getImages()}
        activeIndex={this.getActiveIndex()}
        style={this.getStyle()}
        size={this.getSize()}
        stripGap={this.getStripGap()}
        stripHeight={this.getStripHeight()}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createGalleryNode(
  images: ReadonlyArray<GalleryImage>,
  initialActiveIndex?: number,
  style?: GalleryStyle,
  size?: number,
  stripGap?: number,
  stripHeight?: number,
): GalleryNode {
  return new GalleryNode(
    images,
    initialActiveIndex,
    style,
    size,
    stripGap,
    stripHeight,
  );
}

export function $isGalleryNode(
  node: LexicalNode | null | undefined,
): node is GalleryNode {
  return node instanceof GalleryNode;
}
