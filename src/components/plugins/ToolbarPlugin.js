import React, { useRef, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createTextNode,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createQuoteNode } from "@lexical/rich-text";
import { $createListNode } from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import { $createLinkNode } from "@lexical/link";
import { storage } from "../../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { INSERT_IMAGE_COMMAND } from "./ImagePlugin";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef(null);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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

  const formatStrikethrough = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
  };

  const formatCodeBlock = () => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "code");
  };

  const insertLink = () => {
    if (!isLink) {
      setIsLink(true);
      setLinkUrl("");
    } else {
      if (linkUrl) {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createLinkNode(linkUrl);
            selection.insertNodes([node]);
          }
        });
      }
      setIsLink(false);
      setLinkUrl("");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, file);
    } else {
      alert("Please select an image file.");
    }
    e.target.value = ""; // Reset the input
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={undo} title="Undo">
          <i className="fas fa-undo"></i>
        </button>
        <button onClick={redo} title="Redo">
          <i className="fas fa-redo"></i>
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={() => formatHeading("h1")} title="Heading 1">
          H1
        </button>
        <button onClick={() => formatHeading("h2")} title="Heading 2">
          H2
        </button>
        <button onClick={() => formatHeading("h3")} title="Heading 3">
          H3
        </button>
        <button onClick={formatParagraph} title="Paragraph">
          P
        </button>
        <button onClick={formatQuote} title="Quote">
          Quote
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={() => formatList("bullet")} title="Bullet List">
          <i className="fas fa-list-ul"></i>
        </button>
        <button onClick={() => formatList("number")} title="Numbered List">
          <i className="fas fa-list-ol"></i>
        </button>
        <button onClick={formatCode} title="Code Block">
          <i className="fas fa-code"></i>
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={formatBold} title="Bold">
          <i className="fas fa-bold"></i>
        </button>
        <button onClick={formatItalic} title="Italic">
          <i className="fas fa-italic"></i>
        </button>
        <button onClick={formatUnderline} title="Underline">
          <i className="fas fa-underline"></i>
        </button>
        <button onClick={formatStrikethrough} title="Strikethrough">
          <i className="fas fa-strikethrough"></i>
        </button>
        <button onClick={formatCodeBlock} title="Inline Code">
          <i className="fas fa-code"></i>
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={insertLink} title="Insert Link">
          <i className="fas fa-link"></i>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
        >
          <i className="fas fa-image"></i>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: "none" }}
        />
      </div>
      {isLink && (
        <div className="link-input">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL"
          />
          <button onClick={insertLink}>Insert</button>
          <button onClick={() => setIsLink(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default ToolbarPlugin;
