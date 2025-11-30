/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { LexicalCollaboration } from "@lexical/react/LexicalCollaborationContext";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from "lexical";
import { type JSX, useMemo } from "react";

import { buildHTMLConfig } from "./buildHTMLConfig";
import { ArticleContextProvider } from "./context/ArticleContext";
import { useSettings } from "./context/SettingsContext";
import { SharedHistoryContext } from "./context/SharedHistoryContext";
import { ToolbarContext } from "./context/ToolbarContext";
import Editor from "./Editor";
import PlaygroundNodes from "./nodes/PlaygroundNodes";
import LoadEditorStatePlugin from "./plugins/LoadEditorStatePlugin";
import { TableContext } from "./plugins/TablePlugin";
import PlaygroundEditorTheme from "./themes/PlaygroundEditorTheme";

function $prepopulatedRichText() {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode("Welcome to the editor"));
    root.append(paragraph);
  }
}

interface AppProps {
  initialEditorState?: string | null;
  articleId?: string;
  articleTitle?: string;
  articleTags?: string[];
  articleThumbnailUrl?: string | null;
  onBeforeNavigate?: () => void;
}

export default function App({
  initialEditorState,
  articleId,
  articleTitle,
  articleTags,
  articleThumbnailUrl,
  onBeforeNavigate,
}: AppProps = {}): JSX.Element {
  const {
    settings: { isCollab, emptyEditor },
  } = useSettings();

  const app = useMemo(
    () =>
      defineExtension({
        $initialEditorState: isCollab
          ? null
          : initialEditorState
            ? undefined // Let LoadEditorStatePlugin handle loading the state
            : emptyEditor
              ? undefined
              : $prepopulatedRichText,
        html: buildHTMLConfig(),
        name: "@lexical/playground",
        namespace: "Playground",
        nodes: PlaygroundNodes,
        theme: PlaygroundEditorTheme,
      }),
    [emptyEditor, isCollab, initialEditorState]
  );

  return (
    <ArticleContextProvider
      articleId={articleId}
      articleTitle={articleTitle}
      articleTags={articleTags}
      articleThumbnailUrl={articleThumbnailUrl}
      onBeforeNavigate={onBeforeNavigate}
    >
      <LexicalCollaboration>
        <LexicalExtensionComposer extension={app} contentEditable={null}>
          <SharedHistoryContext>
            <TableContext>
              <ToolbarContext>
                <div className="editor-shell">
                  {initialEditorState && (
                    <LoadEditorStatePlugin editorState={initialEditorState} />
                  )}
                  <Editor></Editor>
                </div>
              </ToolbarContext>
            </TableContext>
          </SharedHistoryContext>
        </LexicalExtensionComposer>
      </LexicalCollaboration>
    </ArticleContextProvider>
  );
}
