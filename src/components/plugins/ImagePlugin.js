import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from "lexical";
import { useEffect } from "react";
import { storage } from "../../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { $createImageNode } from "../nodes/ImageNode";

export const INSERT_IMAGE_COMMAND = "INSERT_IMAGE_COMMAND";

export default function ImagePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      async (payload) => {
        try {
          const file = payload;
          if (!file || !file.type.startsWith("image/")) {
            return false;
          }

          // Upload to Firebase
          const storageRef = ref(
            storage,
            `article-images/${Date.now()}-${file.name}`
          );
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);

          // Insert into editor
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const paragraph = $createParagraphNode();

              // Create an image node
              const imageNode = $createImageNode(
                downloadURL,
                file.name,
                "100%",
                "auto",
                "100%"
              );

              paragraph.append(imageNode);
              selection.insertNodes([paragraph]);
            }
          });

          return true;
        } catch (error) {
          console.error("Error uploading image:", error);
          return false;
        }
      },
      0
    );
  }, [editor]);

  return null;
}
