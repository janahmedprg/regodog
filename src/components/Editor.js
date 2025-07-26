import React, { useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes } from "@lexical/html";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createListNode } from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import ToolbarPlugin from "./plugins/ToolbarPlugin";
import ImagePlugin from "./plugins/ImagePlugin";
import ImageSelectionPlugin from "./plugins/ImageSelectionPlugin";
import { ImageNode } from "./nodes/ImageNode";
import "./Editor.css";

const theme = {
  ltr: "ltr",
  rtl: "rtl",
  placeholder: "editor-placeholder",
  paragraph: "editor-paragraph",
  quote: "editor-quote",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
    h4: "editor-heading-h4",
    h5: "editor-heading-h5",
    h6: "editor-heading-h6",
  },
  list: {
    nested: {
      listitem: "editor-nested-listitem",
    },
    ol: "editor-list-ol",
    ul: "editor-list-ul",
    listitem: "editor-listitem",
  },
  link: "editor-link",
  text: {
    bold: "editor-text-bold",
    italic: "editor-text-italic",
    underline: "editor-text-underline",
    strikethrough: "editor-text-strikethrough",
    underlineStrikethrough: "editor-text-underlineStrikethrough",
    code: "editor-text-code",
  },
  table: "editor-table",
  tableCell: "editor-table-cell",
  tableCellHeader: "editor-table-cell-header",
  tableRow: "editor-table-row",
  image: "editor-image",
};

function Placeholder() {
  return <div className="editor-placeholder">Enter some text...</div>;
}

function EditorPlugin() {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    // Register command handlers
    editor.registerCommand(
      "format-heading",
      (headingSize) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createHeadingNode(headingSize);
            selection.insertNodes([node]);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    editor.registerCommand(
      "format-paragraph",
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createParagraphNode();
            selection.insertNodes([node]);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    editor.registerCommand(
      "format-quote",
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createQuoteNode();
            selection.insertNodes([node]);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    editor.registerCommand(
      "format-list",
      (listType) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createListNode(listType);
            selection.insertNodes([node]);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    editor.registerCommand(
      "format-code",
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = $createCodeNode();
            selection.insertNodes([node]);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    // Register keyboard shortcuts
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        editor.dispatchCommand(UNDO_COMMAND);
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    editor.registerCommand(
      REDO_COMMAND,
      () => {
        editor.dispatchCommand(REDO_COMMAND);
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
}

const Editor = ({ initialEditorState, onSave }) => {
  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError: (error) => {
      console.error(error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
    editorState: initialEditorState,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<Placeholder />}
            ErrorBoundary={({ children }) => (
              <div className="editor-error-boundary">{children}</div>
            )}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <LinkPlugin />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <EditorPlugin />
          <ImagePlugin />
          <ImageSelectionPlugin />
        </div>
        <div className="editor-footer">
          <SaveButton onSave={onSave} />
        </div>
      </div>
    </LexicalComposer>
  );
};

function SaveButton({ onSave }) {
  const [editor] = useLexicalComposerContext();

  const handleSave = useCallback(() => {
    if (onSave) {
      editor.update(() => {
        try {
          const editorState = editor.getEditorState();
          const editorStateJSON = JSON.stringify(editorState);

          // Generate HTML directly from the current editor state
          const htmlContent = editorState.read(() => {
            return $generateHtmlFromNodes(editor);
          });

          onSave(editorStateJSON, htmlContent);
        } catch (error) {
          console.error("Error generating HTML:", error);
          onSave(JSON.stringify(editor.getEditorState()), "");
        }
      });
    }
  }, [editor, onSave]);

  return (
    <button onClick={handleSave} className="edit-save-button">
      Save Changes
    </button>
  );
}

export default Editor;
