/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $isRootOrShadowRoot,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';
import {useEffect} from 'react';

import {
  GalleryImage,
  GalleryNode,
  $createGalleryNode,
} from '../../nodes/GalleryNode';
import InsertGalleryDialogBase from '../../ui/GalleryInsertDialog';

export type InsertGalleryPayload = Readonly<{
  images: readonly GalleryImage[];
}>;

export const INSERT_GALLERY_COMMAND: LexicalCommand<InsertGalleryPayload> =
  createCommand('INSERT_GALLERY_COMMAND');

export default function GalleryPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([GalleryNode])) {
      throw new Error('GalleryPlugin: GalleryNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertGalleryPayload>(
        INSERT_GALLERY_COMMAND,
        (payload) => {
          const galleryNode = $createGalleryNode(payload.images);
          $insertNodes([galleryNode]);
          if ($isRootOrShadowRoot(galleryNode.getParentOrThrow())) {
            $wrapNodeInElement(galleryNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}

export function InsertGalleryDialog({
  activeEditor,
  onClose,
  onSubmit,
  initialImages,
  submitButtonText,
  title,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
  onSubmit?: (images: GalleryImage[]) => void;
  initialImages?: readonly GalleryImage[];
  submitButtonText?: string;
  title?: string;
}): JSX.Element {
  return (
    <InsertGalleryDialogBase
      activeEditor={activeEditor}
      onClose={onClose}
      onSubmit={
        onSubmit ??
        ((images: GalleryImage[]) => {
          activeEditor.dispatchCommand(INSERT_GALLERY_COMMAND, {images});
        })
      }
      initialImages={initialImages}
      submitButtonText={submitButtonText}
      title={title}
    />
  );
}
