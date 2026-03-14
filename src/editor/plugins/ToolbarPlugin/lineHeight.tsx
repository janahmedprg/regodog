/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this root/source code.
 *
 */

import './fontSize.css';

import {SKIP_DOM_SELECTION_TAG, type LexicalEditor} from 'lexical';
import * as React from 'react';
import {$addUpdateTag, $getSelection} from 'lexical';
import {$patchStyleText} from '@lexical/selection';

import {isKeyboardInput} from '../../utils/focusUtils';

export const MIN_ALLOWED_LINE_HEIGHT = 1;
export const MAX_ALLOWED_LINE_HEIGHT = 3;
export const DEFAULT_LINE_HEIGHT = '1.7';
const LINE_HEIGHT_STEP = 0.1;

function parseLineHeight(input: string): number | null {
  const match = input.match(/^\d*\.?\d+$/);
  if (!match) {
    return null;
  }

  const lineHeight = Number(match[0]);
  return Number.isFinite(lineHeight) ? lineHeight : null;
}

function normalizeLineHeight(lineHeight: number): number {
  return Math.round(lineHeight * 100) / 100;
}

function isValidLineHeight(lineHeight: number): boolean {
  return (
    lineHeight >= MIN_ALLOWED_LINE_HEIGHT && lineHeight <= MAX_ALLOWED_LINE_HEIGHT
  );
}

function clampLineHeight(lineHeight: number): number {
  if (lineHeight < MIN_ALLOWED_LINE_HEIGHT) {
    return MIN_ALLOWED_LINE_HEIGHT;
  }
  if (lineHeight > MAX_ALLOWED_LINE_HEIGHT) {
    return MAX_ALLOWED_LINE_HEIGHT;
  }
  return normalizeLineHeight(lineHeight);
}

function calculateNextLineHeight(currentLineHeight: number, delta: number): number {
  return clampLineHeight(normalizeLineHeight(currentLineHeight + delta));
}

export function parseLineHeightForToolbar(input: string): string {
  const parsed = parseLineHeight(input);
  return parsed !== null ? `${normalizeLineHeight(parsed)}` : '';
}

export function parseAllowedLineHeight(input: string): string {
  const parsed = parseLineHeight(input);
  if (parsed === null) {
    return '';
  }
  return isValidLineHeight(parsed) ? `${normalizeLineHeight(parsed)}` : '';
}

function normalizeInput(input: string): string {
  const parsed = parseLineHeight(input.trim());
  return parsed === null ? DEFAULT_LINE_HEIGHT : `${clampLineHeight(parsed)}`;
}

function applyLineHeightInSelection(
  editor: LexicalEditor,
  lineHeight: number,
  skipRefocus: boolean,
) {
  editor.update(() => {
    if (skipRefocus) {
      $addUpdateTag(SKIP_DOM_SELECTION_TAG);
    }
    if (!editor.isEditable()) {
      return;
    }
    const selection = $getSelection();
    if (selection !== null) {
      $patchStyleText(selection, {
        'line-height': `${clampLineHeight(lineHeight)}`,
      });
    }
  });
}

function getLineHeightForStep(
  selectionLineHeight: string,
  delta: number,
): number {
  const current = parseLineHeight(selectionLineHeight);
  const base = isValidLineHeight(current ?? -1)
    ? current
    : Number.parseFloat(DEFAULT_LINE_HEIGHT);
  return calculateNextLineHeight(base, delta);
}

export default function LineHeight({
  selectionLineHeight,
  disabled,
  editor,
}: {
  selectionLineHeight: string;
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [inputValue, setInputValue] = React.useState<string>(
    normalizeInput(selectionLineHeight),
  );
  const [inputChangeFlag, setInputChangeFlag] = React.useState<boolean>(false);
  const [isMouseMode, setIsMouseMode] = React.useState(false);

  React.useEffect(() => {
    setInputValue(normalizeInput(selectionLineHeight));
  }, [selectionLineHeight]);

  const updateLineHeightByInput = (
    value: string,
    skipRefocus: boolean = false,
  ) => {
    const normalized = normalizeInput(value);
    const parsed = parseLineHeight(normalized);
    if (parsed === null) {
      return;
    }
    setInputValue(normalized);
    applyLineHeightInSelection(editor, parsed, skipRefocus);
    setInputChangeFlag(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const parsed = parseLineHeight(inputValue);
    setInputChangeFlag(true);
    if (e.key === 'Tab') {
      return;
    }
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (parsed !== null) {
        updateLineHeightByInput(inputValue, !isMouseMode);
      } else {
        setInputValue(DEFAULT_LINE_HEIGHT);
      }
    }
  };

  const handleBlur = () => {
    setIsMouseMode(false);
    if (inputValue !== '' && inputChangeFlag) {
      updateLineHeightByInput(inputValue);
    } else {
      const restored = normalizeInput(inputValue);
      setInputValue(restored);
      setInputChangeFlag(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={
          disabled ||
          !isValidLineHeight(parseLineHeight(inputValue) ?? Number.NaN) ||
          Number(inputValue) <= MIN_ALLOWED_LINE_HEIGHT
        }
        onClick={(e) => {
          const next = getLineHeightForStep(
            selectionLineHeight,
            -LINE_HEIGHT_STEP,
          );
          applyLineHeightInSelection(editor, next, isKeyboardInput(e));
        }}
        className="toolbar-item line-height-decrement"
        aria-label="Decrease line height"
        title="Decrease line height"
      >
        <i className="format minus-icon" />
      </button>

      <input
        type="number"
        title="Line height"
        value={inputValue}
        disabled={disabled}
        className="toolbar-item line-height-input"
        min={MIN_ALLOWED_LINE_HEIGHT}
        max={MAX_ALLOWED_LINE_HEIGHT}
        step="0.1"
        onChange={(e) => setInputValue(e.target.value)}
        onClick={() => setIsMouseMode(true)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />

      <button
        type="button"
        disabled={
          disabled ||
          !isValidLineHeight(parseLineHeight(inputValue) ?? Number.NaN) ||
          Number(inputValue) >= MAX_ALLOWED_LINE_HEIGHT
        }
        onClick={(e) => {
          const next = getLineHeightForStep(
            selectionLineHeight,
            LINE_HEIGHT_STEP,
          );
          applyLineHeightInSelection(editor, next, isKeyboardInput(e));
        }}
        className="toolbar-item line-height-increment"
        aria-label="Increase line height"
        title="Increase line height"
      >
        <i className="format add-icon" />
      </button>
    </>
  );
}
