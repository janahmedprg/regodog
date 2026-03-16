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
  articlePinned?: boolean;
  articlePinnedOrder?: number;
  articleTagPinnedOrders?: Record<string, number>;
  articleThumbnailUrl?: string | null;
  articleThumbnailAltText?: string;
  articleThumbnailPositionX?: number;
  articleThumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
  onBeforeNavigate?: () => void;
}

const ArticleContext = createContext<ArticleContextValue>({});

export function ArticleContextProvider({
  children,
  articleId,
  articleTitle,
  articleTags,
  articlePinned,
  articlePinnedOrder,
  articleTagPinnedOrders,
  articleThumbnailUrl,
  articleThumbnailAltText,
  articleThumbnailPositionX,
  articleThumbnailPositionY,
  newsFeedThumbnailPositionX,
  newsFeedThumbnailPositionY,
  onBeforeNavigate,
}: {
  children: ReactNode;
  articleId?: string;
  articleTitle?: string;
  articleTags?: string[];
  articlePinned?: boolean;
  articlePinnedOrder?: number;
  articleTagPinnedOrders?: Record<string, number>;
  articleThumbnailUrl?: string | null;
  articleThumbnailAltText?: string;
  articleThumbnailPositionX?: number;
  articleThumbnailPositionY?: number;
  newsFeedThumbnailPositionX?: number;
  newsFeedThumbnailPositionY?: number;
  onBeforeNavigate?: () => void;
}) {
  const resolvedThumbnailPositionX = articleThumbnailPositionX ?? 50;
  const resolvedThumbnailPositionY = articleThumbnailPositionY ?? 50;
  const resolvedNewsFeedThumbnailPositionX = newsFeedThumbnailPositionX ?? 50;
  const resolvedNewsFeedThumbnailPositionY = newsFeedThumbnailPositionY ?? 50;

  return (
    <ArticleContext.Provider
      value={{
        articleId,
        articleTitle,
        articleTags,
        articlePinned,
        articlePinnedOrder,
        articleTagPinnedOrders,
        articleThumbnailUrl,
        articleThumbnailAltText,
        articleThumbnailPositionX: resolvedThumbnailPositionX,
        articleThumbnailPositionY: resolvedThumbnailPositionY,
        newsFeedThumbnailPositionX: resolvedNewsFeedThumbnailPositionX,
        newsFeedThumbnailPositionY: resolvedNewsFeedThumbnailPositionY,
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
