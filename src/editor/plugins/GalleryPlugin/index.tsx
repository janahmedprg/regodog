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
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Button from '../../ui/Button';
import {DialogActions} from '../../ui/Dialog';
import {GalleryNode, $createGalleryNode, GalleryImage} from '../../nodes/GalleryNode';

export type InsertGalleryPayload = Readonly<{
  images: readonly GalleryImage[];
}>;

export const INSERT_GALLERY_COMMAND: LexicalCommand<InsertGalleryPayload> =
  createCommand('INSERT_GALLERY_COMMAND');

function parseGalleryText(value: string): GalleryImage[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry, idx) => {
      const [srcValue, ...altParts] = entry.split('|');
      const src = srcValue.trim();
      if (!src) {
        return null;
      }
      const altText = altParts.join('|').trim();
      return {
        src,
        altText: altText || `Image ${idx + 1}`,
      };
    })
    .filter((image): image is GalleryImage => image !== null);
}

function updateUploadedImageAlt(
  images: GalleryImage[],
  index: number,
  altText: string,
): GalleryImage[] {
  return images.map((image, imageIndex) =>
    imageIndex === index ? {...image, altText} : image,
  );
}

function readImagesFromFiles(files: FileList): Promise<GalleryImage[]> {
  const imageFiles = Array.from(files).filter((file) =>
    file.type.startsWith('image/'),
  );
  if (imageFiles.length === 0) {
    return Promise.resolve([]);
  }

  const readAsDataUrl = (file: File): Promise<GalleryImage> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve({
          src: String(reader.result || ''),
          altText: file.name.replace(/\.[^.]+$/, '') || 'Uploaded image',
        });
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });

  return Promise.all(imageFiles.map(readAsDataUrl));
}

function InsertGalleryDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const [value, setValue] = useState('');
  const [uploadedImages, setUploadedImages] = useState<GalleryImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const images = useMemo(
    () => [...parseGalleryText(value), ...uploadedImages],
    [uploadedImages, value],
  );
  const canInsert = images.length >= 2;

  const onClick = () => {
    if (!canInsert) {
      return;
    }
    activeEditor.dispatchCommand(INSERT_GALLERY_COMMAND, {images});
    onClose();
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const {files} = event.target;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    try {
      const nextImages = await readImagesFromFiles(files);
      setUploadedImages((prev) => [...prev, ...nextImages]);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <p style={{ marginTop: 10, marginBottom: 8 }}>
        Paste one image per line. Optional alt text can be added with
        &nbsp;
        <code>imageUrl|alt text</code>.
      </p>
      <label className="Input__label" htmlFor="gallery-upload">
        Upload from your computer
      </label>
      <input
        id="gallery-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        disabled={isUploading}
        style={{ width: '100%' }}
      />
      {uploadedImages.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {uploadedImages.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <img
                src={image.src}
                alt={image.altText || `Uploaded image ${index + 1}`}
                style={{
                  width: '48px',
                  height: '48px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={image.altText}
                onChange={(event) => {
                  const {value} = event.target;
                  setUploadedImages((prev) =>
                    updateUploadedImageAlt(prev, index, value),
                  );
                }}
                placeholder="Alt text"
                aria-label={`Alt text for uploaded image ${index + 1}`}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #cfd6de',
                  borderRadius: '4px',
                  width: '100%',
                }}
              />
            </div>
          ))}
        </div>
      )}
      {uploadedImages.length > 0 && (
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Uploaded {uploadedImages.length} image
          {uploadedImages.length === 1 ? '' : 's'} added.
        </p>
      )}
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://example.com/hero.jpg|Hero image\nhttps://example.com/detail.jpg|Detail image"
        style={{
          width: '100%',
          minHeight: '120px',
          marginTop: '4px',
          padding: '8px',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
        data-test-id="gallery-modal-textarea"
      />
      <DialogActions>
        <Button disabled={!canInsert || isUploading} onClick={onClick}>
          Insert Gallery ({images.length} image{images.length === 1 ? '' : 's'})
        </Button>
      </DialogActions>
    </>
  );
}

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

export {InsertGalleryDialog, type InsertGalleryPayload};
