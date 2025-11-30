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
  onBeforeNavigate?: () => void;
}

const ArticleContext = createContext<ArticleContextValue>({});

export function ArticleContextProvider({
  children,
  articleId,
  articleTitle,
  articleTags,
  articleThumbnailUrl,
  onBeforeNavigate,
}: {
  children: ReactNode;
  articleId?: string;
  articleTitle?: string;
  articleTags?: string[];
  articleThumbnailUrl?: string | null;
  onBeforeNavigate?: () => void;
}) {
  return (
    <ArticleContext.Provider
      value={{
        articleId,
        articleTitle,
        articleTags,
        articleThumbnailUrl,
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

