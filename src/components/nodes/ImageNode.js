import { DecoratorNode } from "lexical";
import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import ResizableImage from "./ResizableImage";

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

    // Get the current dimensions (either from node or stored values)
    const currentWidth =
      window.imageDimensions && window.imageDimensions[this.getKey()]
        ? window.imageDimensions[this.getKey()].width
        : this.__width;
    const currentHeight =
      window.imageDimensions && window.imageDimensions[this.getKey()]
        ? window.imageDimensions[this.getKey()].height
        : this.__height;

    if (currentWidth) {
      element.setAttribute("width", currentWidth);
    }
    if (currentHeight) {
      element.setAttribute("height", currentHeight);
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

  setWidth(width) {
    this.__width = width;
  }

  setHeight(height) {
    this.__height = height;
  }

  decorate() {
    return <ImageComponent node={this} />;
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
    // Get the current dimensions (either from node or stored values)
    const currentWidth =
      window.imageDimensions && window.imageDimensions[this.getKey()]
        ? window.imageDimensions[this.getKey()].width
        : this.__width;
    const currentHeight =
      window.imageDimensions && window.imageDimensions[this.getKey()]
        ? window.imageDimensions[this.getKey()].height
        : this.__height;

    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: currentWidth,
      height: currentHeight,
      maxWidth: this.__maxWidth,
    };
  }
}

function ImageComponent({ node }) {
  const [editor] = useLexicalComposerContext();

  const handleResize = React.useCallback(
    (newWidth, newHeight) => {
      console.log("Image resized to:", newWidth, "x", newHeight);

      // Store the dimensions globally so they persist
      if (window.imageDimensions) {
        window.imageDimensions[node.getKey()] = {
          width: newWidth,
          height: newHeight,
        };
      } else {
        window.imageDimensions = {
          [node.getKey()]: { width: newWidth, height: newHeight },
        };
      }

      // Update the node within the editor state
      editor.update(() => {
        // Create a new node with the updated dimensions
        const newNode = new ImageNode(
          node.__src,
          node.__altText,
          newWidth,
          newHeight,
          node.__maxWidth,
          node.getKey()
        );

        // Replace the current node with the new one
        node.replace(newNode);
      });
    },
    [editor, node]
  );

  // Get the current dimensions (either from node or stored values)
  const getCurrentWidth = () => {
    if (window.imageDimensions && window.imageDimensions[node.getKey()]) {
      return window.imageDimensions[node.getKey()].width;
    }
    return node.__width;
  };

  const getCurrentHeight = () => {
    if (window.imageDimensions && window.imageDimensions[node.getKey()]) {
      return window.imageDimensions[node.getKey()].height;
    }
    return node.__height;
  };

  return (
    <ResizableImage
      src={node.__src}
      alt={node.__altText}
      width={getCurrentWidth()}
      height={getCurrentHeight()}
      maxWidth={node.__maxWidth}
      onResize={handleResize}
      nodeKey={node.getKey()}
      isSelected={false} // This will be handled by selection state
    />
  );
}

export function $createImageNode(src, altText, width, height, maxWidth) {
  return new ImageNode(src, altText, width, height, maxWidth);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
