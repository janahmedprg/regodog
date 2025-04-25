import React, { useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  $createTextNode,
} from "lexical";
import { $createLinkNode } from "@lexical/link";
import { storage } from "../../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef(null);

  const formatHeading = (headingSize) => {
    editor.dispatchCommand("format-heading", headingSize);
  };

  const formatParagraph = () => {
    editor.dispatchCommand("format-paragraph");
  };

  const formatQuote = () => {
    editor.dispatchCommand("format-quote");
  };

  const formatList = (listType) => {
    editor.dispatchCommand("format-list", listType);
  };

  const formatCode = () => {
    editor.dispatchCommand("format-code");
  };

  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  };

  const formatUnderline = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const node = $createLinkNode(url);
          selection.insertNodes([node]);
        }
      });
    }
  };

  const handleImageUpload = async (file) => {
    try {
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(
        storage,
        `article-images/${Date.now()}-${file.name}`
      );

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Insert the image into the editor
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode("");
          paragraph.append(textNode);

          // Create an image element
          const img = document.createElement("img");
          img.src = downloadURL;
          img.alt = file.name;
          img.style.maxWidth = "100%";
          img.style.height = "auto";

          // Insert the image into the editor
          const imageNode = $createTextNode("");
          imageNode.setFormat("image");
          imageNode.setDetail({ src: downloadURL, alt: file.name });
          paragraph.append(imageNode);

          selection.insertNodes([paragraph]);
        }
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    } else {
      alert("Please select an image file.");
    }
    e.target.value = ""; // Reset the input
  };

  return (
    <div className="toolbar">
      <button onClick={() => formatHeading("h1")}>H1</button>
      <button onClick={() => formatHeading("h2")}>H2</button>
      <button onClick={() => formatHeading("h3")}>H3</button>
      <button onClick={formatParagraph}>Paragraph</button>
      <button onClick={formatQuote}>Quote</button>
      <button onClick={() => formatList("bullet")}>Bullet List</button>
      <button onClick={() => formatList("number")}>Numbered List</button>
      <button onClick={formatCode}>Code</button>
      <button onClick={formatBold}>Bold</button>
      <button onClick={formatItalic}>Italic</button>
      <button onClick={formatUnderline}>Underline</button>
      <button onClick={insertLink}>Link</button>
      <button onClick={() => fileInputRef.current?.click()}>
        Insert Image
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
}

export default ToolbarPlugin;
