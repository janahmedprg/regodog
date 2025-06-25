import { DecoratorNode } from "lexical";
import React from "react";

export class ImageNode extends DecoratorNode {
  __src;
  __altText;
  __width;
  __height;
  __maxWidth;

  static getType() {
    return "image";
  }

  static clone(node) {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__maxWidth,
      node.__key
    );
  }

  constructor(src, altText, width, height, maxWidth, key) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__maxWidth = maxWidth;
  }

  createDOM(config) {
    const div = document.createElement("div");
    div.className = "image-container";
    return div;
  }

  exportDOM(editor) {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    if (this.__width) {
      element.setAttribute("width", this.__width);
    }
    if (this.__height) {
      element.setAttribute("height", this.__height);
    }
    if (this.__maxWidth) {
      element.style.maxWidth = this.__maxWidth;
    }
    return { element };
  }

  updateDOM() {
    return false;
  }

  getSrc() {
    return this.__src;
  }

  getAltText() {
    return this.__altText;
  }

  decorate() {
    return (
      <div className="image-container">
        <img
          src={this.__src}
          alt={this.__altText}
          style={{
            height: this.__height,
            maxWidth: this.__maxWidth,
            width: this.__width,
          }}
        />
      </div>
    );
  }

  isIsolated() {
    return true;
  }

  // Add serialization methods
  static importJSON(serializedNode) {
    const { src, altText, width, height, maxWidth } = serializedNode;
    return $createImageNode(src, altText, width, height, maxWidth);
  }

  exportJSON() {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      maxWidth: this.__maxWidth,
    };
  }
}

export function $createImageNode(src, altText, width, height, maxWidth) {
  return new ImageNode(src, altText, width, height, maxWidth);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
