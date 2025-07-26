import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  $isNodeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from "lexical";
import { $isImageNode } from "../nodes/ImageNode";

export default function ImageSelectionPlugin() {
  const [editor] = useLexicalComposerContext();
  const [selectedImageKey, setSelectedImageKey] = useState(null);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();

        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes();
          const imageNode = nodes.find((node) => $isImageNode(node));

          if (imageNode) {
            setSelectedImageKey(imageNode.getKey());
          } else {
            setSelectedImageKey(null);
          }
        } else if ($isRangeSelection(selection)) {
          // Check if selection is within an image node
          const anchor = selection.anchor;
          const focus = selection.focus;

          if (anchor.key === focus.key) {
            const node = anchor.getNode();
            if ($isImageNode(node)) {
              setSelectedImageKey(node.getKey());
            } else {
              setSelectedImageKey(null);
            }
          } else {
            setSelectedImageKey(null);
          }
        } else {
          setSelectedImageKey(null);
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  // Expose selectedImageKey to child components
  useEffect(() => {
    // This is a simple way to pass the selected state to the ResizableImage
    // In a more complex implementation, you might use React Context or a different state management approach
    window.selectedImageKey = selectedImageKey;
  }, [selectedImageKey]);

  return null;
}
