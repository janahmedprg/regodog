import React, { useState, useRef, useCallback } from "react";

const ResizableImage = ({
  src,
  alt,
  width,
  height,
  maxWidth,
  onResize,
  nodeKey,
  isSelected = false,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isSelectedState, setIsSelectedState] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(() => {
    // Check if we have stored dimensions for this node
    if (window.imageDimensions && window.imageDimensions[nodeKey]) {
      return window.imageDimensions[nodeKey].width;
    }
    return width;
  });
  const [currentHeight, setCurrentHeight] = useState(() => {
    // Check if we have stored dimensions for this node
    if (window.imageDimensions && window.imageDimensions[nodeKey]) {
      return window.imageDimensions[nodeKey].height;
    }
    return height;
  });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Check if this image is selected
  React.useEffect(() => {
    const checkSelection = () => {
      const selectedKey = window.selectedImageKey;
      setIsSelectedState(selectedKey === nodeKey);
    };

    checkSelection();
    const interval = setInterval(checkSelection, 100);

    return () => clearInterval(interval);
  }, [nodeKey]);

  // Sync with node dimensions when they change
  React.useEffect(() => {
    setCurrentWidth(width);
    setCurrentHeight(height);
  }, [width, height]);

  // Handle clicking outside to deselect
  React.useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        if (window.selectedImageKey === nodeKey) {
          window.selectedImageKey = null;
          setIsSelectedState(false);
        }
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [nodeKey]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    });
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing || !imageRef.current) return;

      e.preventDefault();

      const deltaX = e.clientX - resizeStart.x;

      const newWidth = Math.max(50, resizeStart.width + deltaX);

      // Maintain aspect ratio
      const aspectRatio = resizeStart.width / resizeStart.height;
      const finalWidth = newWidth;
      const finalHeight = newWidth / aspectRatio;

      // Update local state for immediate visual feedback
      setCurrentWidth(finalWidth);
      setCurrentHeight(finalHeight);
    },
    [isResizing, resizeStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);

    // Call the onResize callback with the final dimensions
    if (onResize) {
      onResize(currentWidth, currentHeight);
    }
  }, [onResize, currentWidth, currentHeight]);

  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Set this image as selected
      window.selectedImageKey = nodeKey;
      setIsSelectedState(true);
    },
    [nodeKey]
  );

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`resizable-image-container ${
        isSelectedState ? "selected" : ""
      }`}
      style={{
        display: "inline-block",
        position: "relative",
        cursor: isResizing ? "nw-resize" : "default",
      }}
      onClick={handleClick}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        style={{
          width: currentWidth || "100%",
          height: currentHeight || "auto",
          maxWidth: maxWidth || "100%",
          display: "block",
          borderRadius: "4px",
          userSelect: "none",
          pointerEvents: isResizing ? "none" : "auto",
        }}
        onClick={handleClick}
      />

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          bottom: "-6px",
          right: "-6px",
          width: "12px",
          height: "12px",
          backgroundColor: "#3b82f6",
          border: "2px solid white",
          borderRadius: "50%",
          cursor: "nw-resize",
          zIndex: 10,
          opacity: isSelectedState ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Selection border */}
      {isSelectedState && (
        <div
          className="selection-border"
          style={{
            position: "absolute",
            top: "-2px",
            left: "-2px",
            right: "-2px",
            bottom: "-2px",
            border: "2px solid #3b82f6",
            borderRadius: "6px",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
};

export default ResizableImage;
