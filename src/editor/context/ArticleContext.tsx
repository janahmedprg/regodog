/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { createContext, useContext, type ReactNode } from "react";

interface ArticleContextValue {
  articleId?: string;
  articleTitle?: string;
  articleTags?: string[];
  articleThumbnailUrl?: string | null;
  articleThumbnailPositionX?: number;
  articleThumbnailPositionY?: number;
  onBeforeNavigate?: () => void;
}

const ArticleContext = createContext<ArticleContextValue>({});

export function ArticleContextProvider({
  children,
  articleId,
  articleTitle,
  articleTags,
  articleThumbnailUrl,
  articleThumbnailPositionX,
  articleThumbnailPositionY,
  onBeforeNavigate,
}: {
  children: ReactNode;
  articleId?: string;
  articleTitle?: string;
  articleTags?: string[];
  articleThumbnailUrl?: string | null;
  articleThumbnailPositionX?: number;
  articleThumbnailPositionY?: number;
  onBeforeNavigate?: () => void;
}) {
  const resolvedThumbnailPositionX = articleThumbnailPositionX ?? 50;
  const resolvedThumbnailPositionY = articleThumbnailPositionY ?? 50;

  return (
    <ArticleContext.Provider
      value={{
        articleId,
        articleTitle,
        articleTags,
        articleThumbnailUrl,
        articleThumbnailPositionX: resolvedThumbnailPositionX,
        articleThumbnailPositionY: resolvedThumbnailPositionY,
        onBeforeNavigate,
      }}
    >
      {children}
    </ArticleContext.Provider>
  );
}

export function useArticleContext(): ArticleContextValue {
  return useContext(ArticleContext);
}
