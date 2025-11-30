/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import type { JSX } from "react";

interface LoadEditorStatePluginProps {
  editorState: string | null | undefined;
}

export default function LoadEditorStatePlugin({
  editorState,
}: LoadEditorStatePluginProps): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const lastLoadedStateRef = useRef<string | null>(null);

  useEffect(() => {
    // Load the state if editorState is provided and it's different from what we last loaded
    if (editorState && editorState !== lastLoadedStateRef.current) {
      try {
        const parsedEditorState = editor.parseEditorState(editorState);
        editor.setEditorState(parsedEditorState);
        lastLoadedStateRef.current = editorState;
      } catch (error) {
        console.error("Error loading editor state:", error);
      }
    } else if (!editorState) {
      // Reset when editorState is cleared
      lastLoadedStateRef.current = null;
    }
  }, [editor, editorState]);

  return null;
}
