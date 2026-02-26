import React, { Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  db,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  auth,
  collection,
  storage,
  ref,
  deleteObject,
  getDownloadURL,
  uploadBytes,
  runTransaction,
  updateDoc,
} from "../config/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { FaHeart, FaRegHeart } from "react-icons/fa";

import "../styles/styles.css";
import "../styles/tags.css";

const EditorApp = React.lazy(() => import("../editor/App"));

interface ArticleData {
  id?: string;
  title: string;
  tags?: string[];
  thumbnailUrl?: string;
  editorStateUrl?: string;
  htmlContentUrl?: string;
  content?: string;
  htmlContent?: string;
  likesCount?: number;
  likedBy?: string[];
}

interface ArticleProps {
  initialArticle?: ArticleData;
}

interface CommentEntry {
  createdAt: string;
  displayName: string;
  comment: string;
  isAnonymous: boolean;
  userId: string;
}

const COMMENTS_CSV_HEADER = "createdAt,displayName,comment,isAnonymous,userId";

function getFullNameFromUserInfo(data: Record<string, unknown> | undefined): string {
  if (!data) {
    return "";
  }

  const firstName =
    typeof data.firstName === "string" ? data.firstName.trim() : "";
  const middleName =
    typeof data.middleName === "string" ? data.middleName.trim() : "";
  const lastName =
    typeof data.lastName === "string" ? data.lastName.trim() : "";

  return [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCommentsCsv(csvText: string): CommentEntry[] {
  const lines = csvText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const dataLines =
    lines[0] === COMMENTS_CSV_HEADER ? lines.slice(1) : lines.slice();

  return dataLines
    .map((line) => {
      const [createdAt, displayName, comment, isAnonymous, userId] =
        parseCsvLine(line);

      if (!createdAt || !comment) {
        return null;
      }

      return {
        createdAt,
        displayName: displayName || "Anonymous",
        comment,
        isAnonymous: isAnonymous === "true",
        userId: userId || "",
      };
    })
    .filter((entry): entry is CommentEntry => Boolean(entry));
}

function buildCommentsCsv(comments: CommentEntry[]): string {
  const rows = comments.map((entry) =>
    [
      escapeCsvValue(entry.createdAt),
      escapeCsvValue(entry.displayName),
      escapeCsvValue(entry.comment),
      escapeCsvValue(String(entry.isAnonymous)),
      escapeCsvValue(entry.userId),
    ].join(",")
  );

  return [COMMENTS_CSV_HEADER, ...rows].join("\n");
}

const Article: React.FC<ArticleProps> = ({ initialArticle }) => {
  const isBrowser = typeof window !== "undefined";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isSeededArticle = Boolean(initialArticle && initialArticle.id === id);
  const seededHtmlFromDom =
    isBrowser && isSeededArticle && !initialArticle?.htmlContent
      ? document.querySelector(".article-html-content")?.innerHTML || ""
      : "";

  const [article, setArticle] = useState<ArticleData | null>(
    isSeededArticle ? initialArticle || null : null
  );
  const [loading, setLoading] = useState<boolean>(!isSeededArticle);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [editedTitle, setEditedTitle] = useState<string>(
    isSeededArticle ? initialArticle?.title || "" : ""
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isSeededArticle ? initialArticle?.tags || [] : []
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    isSeededArticle ? initialArticle?.thumbnailUrl || null : null
  );

  // NEW: fetched HTML content
  const [htmlContent, setHtmlContent] = useState<string>(
    isSeededArticle ? initialArticle?.htmlContent || seededHtmlFromDom : ""
  );

  // NEW: fetched editorState JSON
  const [fetchedEditorState, setFetchedEditorState] = useState<string | null>(
    null
  );
  const [likesCount, setLikesCount] = useState<number>(
    isSeededArticle ? initialArticle?.likesCount || 0 : 0
  );
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isLikeUpdating, setIsLikeUpdating] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [isAnonymousComment, setIsAnonymousComment] = useState<boolean>(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState<boolean>(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(
    null
  );
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [isCommentEditing, setIsCommentEditing] = useState<boolean>(false);

  // --------------------------
  // Fetch article + file URLs
  // --------------------------
  useEffect(() => {
    if (
      isSeededArticle &&
      (!initialArticle?.htmlContentUrl || Boolean(initialArticle.htmlContent))
    ) {
      return;
    }

    const fetchArticle = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ArticleData;
          setArticle({ ...data, id: docSnap.id });
          setEditedTitle(data.title);
          setSelectedTags(data.tags || []);
          setImagePreview(data.thumbnailUrl || null);

          // Fetch HTML content if URL exists
          if (data.htmlContentUrl) {
            try {
              const response = await fetch(data.htmlContentUrl);
              const html = await response.text();
              setHtmlContent(html);
            } catch (err) {
              console.error("Error fetching HTML:", err);
            }
          }

          // Fetch editorState JSON if URL exists
          if (data.editorStateUrl) {
            try {
              const response = await fetch(data.editorStateUrl);
              const json = await response.text();
              setFetchedEditorState(json);
            } catch (err) {
              console.error("Error fetching editor state JSON:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      }

      setLoading(false);
    };

    fetchArticle();
  }, [id, isSeededArticle, initialArticle]);

  // --------------------------
  // Verify admin status
  // --------------------------
  useEffect(() => {
    if (!auth) {
      return;
    }

    const checkIfAdmin = async (userId: string) => {
      try {
        const snapshot = await getDocs(collection(db, "check-admin"));
        return snapshot.docs.some((d) => d.data().id === userId);
      } catch {
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setCurrentUser(user);
        const adminStatus = await checkIfAdmin(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEngagement = async () => {
      if (!id) return;
      try {
        const articleRef = doc(db, "news", id);
        const articleSnap = await getDoc(articleRef);
        if (!articleSnap.exists()) return;

        const data = articleSnap.data() as ArticleData;
        const nextLikesCount =
          typeof data.likesCount === "number" ? data.likesCount : 0;
        const likedBy = Array.isArray(data.likedBy)
          ? data.likedBy.filter((entry): entry is string => typeof entry === "string")
          : [];

        if (
          typeof data.likesCount !== "number" ||
          !Array.isArray(data.likedBy)
        ) {
          await updateDoc(articleRef, {
            likesCount: nextLikesCount,
            likedBy,
          });
        }

        setLikesCount(nextLikesCount);
        setHasLiked(
          currentUser?.uid ? likedBy.includes(currentUser.uid) : false
        );
      } catch (error) {
        console.error("Error fetching article engagement:", error);
      }
    };

    fetchEngagement();
  }, [id, currentUser?.uid]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return;
      try {
        const commentsRef = ref(storage, `article-comments/${id}.csv`);
        const url = await getDownloadURL(commentsRef);
        const response = await fetch(url);
        const csvText = await response.text();
        setComments(parseCommentsCsv(csvText));
      } catch (error: unknown) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "";

        if (code !== "storage/object-not-found") {
          console.error("Error fetching comments:", error);
        }
        setComments([]);
      }
    };

    fetchComments();
  }, [id]);

  const handleLikeClick = async () => {
    if (!id) return;
    if (!currentUser) {
      navigate("/auth?mode=signin");
      return;
    }
    if (isLikeUpdating) return;

    setIsLikeUpdating(true);
    try {
      const articleRef = doc(db, "news", id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(articleRef);
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data() as ArticleData;
        const likedBy = Array.isArray(data.likedBy)
          ? data.likedBy.filter((entry): entry is string => typeof entry === "string")
          : [];
        const currentLikesCount =
          typeof data.likesCount === "number" ? data.likesCount : 0;

        const alreadyLiked = likedBy.includes(currentUser.uid);
        const nextLikedBy = alreadyLiked
          ? likedBy.filter((uid) => uid !== currentUser.uid)
          : [...likedBy, currentUser.uid];
        const nextLikesCount = alreadyLiked
          ? Math.max(currentLikesCount - 1, 0)
          : currentLikesCount + 1;

        transaction.update(articleRef, {
          likedBy: nextLikedBy,
          likesCount: nextLikesCount,
        });

        setHasLiked(!alreadyLiked);
        setLikesCount(nextLikesCount);
      });
    } catch (error) {
      console.error("Error updating like:", error);
    } finally {
      setIsLikeUpdating(false);
    }
  };

  const handleSubmitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    if (!currentUser) {
      navigate("/auth?mode=signin");
      return;
    }

    const normalizedComment = commentText.trim().replace(/\r?\n/g, " ");
    if (!normalizedComment) {
      return;
    }
    if (isCommentSubmitting) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      let resolvedDisplayName = "Anonymous";
      if (!isAnonymousComment) {
        const userInfoRef = doc(db, "user-info", currentUser.uid);
        const userInfoSnap = await getDoc(userInfoRef);
        const userInfo = userInfoSnap.exists()
          ? (userInfoSnap.data() as Record<string, unknown>)
          : undefined;

        const fullName = getFullNameFromUserInfo(userInfo);
        const emailFromUserInfo =
          userInfo && typeof userInfo.email === "string"
            ? userInfo.email.trim()
            : "";

        resolvedDisplayName =
          fullName ||
          emailFromUserInfo ||
          currentUser.email ||
          currentUser.displayName ||
          "User";
      }

      const newComment: CommentEntry = {
        createdAt: new Date().toISOString(),
        displayName: resolvedDisplayName,
        comment: normalizedComment,
        isAnonymous: isAnonymousComment,
        userId: currentUser.uid,
      };

      const updatedComments = [...comments, newComment];
      const csvData = buildCommentsCsv(updatedComments);
      const commentsRef = ref(storage, `article-comments/${id}.csv`);
      const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      await uploadBytes(commentsRef, csvBlob, {
        contentType: "text/csv;charset=utf-8",
      });

      setComments(updatedComments);
      setCommentText("");
      setIsAnonymousComment(false);
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleStartEditComment = (originalIndex: number) => {
    const target = comments[originalIndex];
    if (!currentUser || !target || target.userId !== currentUser.uid) {
      return;
    }

    setEditingCommentIndex(originalIndex);
    setEditingCommentText(target.comment);
  };

  const handleCancelEditComment = () => {
    setEditingCommentIndex(null);
    setEditingCommentText("");
  };

  const handleSaveEditedComment = async (originalIndex: number) => {
    if (!id || !currentUser) {
      navigate("/auth?mode=signin");
      return;
    }
    if (isCommentEditing) {
      return;
    }

    const target = comments[originalIndex];
    if (!target || target.userId !== currentUser.uid) {
      return;
    }

    const normalizedComment = editingCommentText.trim().replace(/\r?\n/g, " ");
    if (!normalizedComment) {
      return;
    }

    setIsCommentEditing(true);
    try {
      const updatedComments = comments.map((entry, index) =>
        index === originalIndex ? { ...entry, comment: normalizedComment } : entry
      );

      const csvData = buildCommentsCsv(updatedComments);
      const commentsRef = ref(storage, `article-comments/${id}.csv`);
      const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      await uploadBytes(commentsRef, csvBlob, {
        contentType: "text/csv;charset=utf-8",
      });

      setComments(updatedComments);
      setEditingCommentIndex(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Error editing comment:", error);
    } finally {
      setIsCommentEditing(false);
    }
  };

  const handleCancel = () => {
    if (!article) return;
    setIsEditing(false);
    setEditedTitle(article.title);
    setSelectedTags(article.tags || []);
    setImagePreview(article.thumbnailUrl || null);
  };

  const handleRemove = async () => {
    if (!id) return;

    const confirmDelete = window.confirm("Delete this article?");
    if (!confirmDelete) return;

    try {
      const docRef = doc(db, "news", id);
      const snap = await getDoc(docRef);
      const data = snap.data() as ArticleData;

      // Delete thumbnail image if it exists
      if (data?.thumbnailUrl) {
        try {
          // Extract path from Firebase Storage download URL
          const urlObj = new URL(data.thumbnailUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const imgRef = ref(storage, decodedPath);
            await deleteObject(imgRef);
          }
        } catch (err) {
          console.warn("Error deleting thumbnail image:", err);
        }
      }

      // Delete editor state file if it exists
      if (data?.editorStateUrl) {
        try {
          // Extract path from Firebase Storage download URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2FTO%2FFILE?alt=media&token=...
          const urlObj = new URL(data.editorStateUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const editorStateRef = ref(storage, decodedPath);
            await deleteObject(editorStateRef);
          }
        } catch (err) {
          console.warn("Error deleting editor state file:", err);
        }
      }

      // Delete HTML content file if it exists
      if (data?.htmlContentUrl) {
        try {
          // Extract path from Firebase Storage download URL
          const urlObj = new URL(data.htmlContentUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1]);
            const htmlRef = ref(storage, decodedPath);
            await deleteObject(htmlRef);
          }
        } catch (err) {
          console.warn("Error deleting HTML content file:", err);
        }
      }

      await deleteDoc(docRef);
      navigate("/");
    } catch (error) {
      console.error("Error removing article:", error);
    }
  };

  // --------------------------
  // LOADING STATES
  // --------------------------
  if (loading) return <div className="loading">Loading...</div>;
  if (!article) return <div className="error">Article not found</div>;

  // Only block rendering when there is no server/client HTML and no plain text fallback.
  if (article.htmlContentUrl && !htmlContent && !article.content) {
    return <div className="loading">Loading article...</div>;
  }

  // Editor state is only needed when entering edit mode.
  if (isEditing && article.editorStateUrl && !fetchedEditorState) {
    return <div className="loading">Loading editor data...</div>;
  }

  // --------------------------
  // MAIN RENDER
  // --------------------------
  return (
    <div className="article-container">
      {isEditing ? (
        <div className="edit-mode">
          {isBrowser && (
            <Suspense fallback={<div className="loading">Loading editor...</div>}>
              <EditorApp
                initialEditorState={
                  fetchedEditorState || article.editorStateUrl || ""
                }
                articleId={id}
                articleTitle={editedTitle}
                articleTags={selectedTags}
                articleThumbnailUrl={imagePreview || article.thumbnailUrl}
                onBeforeNavigate={() => setIsEditing(false)}
              />
            </Suspense>
          )}

          <div className="edit-buttons">
            <button onClick={handleCancel} className="edit-button">
              Discard
            </button>
          </div>
        </div>
      ) : (
        <>
          {article.thumbnailUrl && (
            <div className="article-thumbnail">
              <img src={article.thumbnailUrl} alt="Thumbnail" />
            </div>
          )}

          <h1>{article.title}</h1>

          <div className="article-tags">
            {article.tags?.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="article-content">
            {htmlContent ? (
              <div
                className="article-html-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <p>{article.content}</p>
            )}
          </div>

          <section className="article-interactions">
            <div className="article-like-row">
              <button
                className={`article-like-button ${hasLiked ? "article-like-button-active" : ""}`}
                onClick={handleLikeClick}
                disabled={isLikeUpdating}
                aria-label={hasLiked ? "Unlike this article" : "Like this article"}
              >
                <span className="article-like-icon" aria-hidden="true">
                  {hasLiked ? <FaHeart /> : <FaRegHeart />}
                </span>
                <span className="article-like-text">{hasLiked ? "Liked" : "Like"}</span>
                <span className="article-like-count">{likesCount}</span>
              </button>
              {!currentUser && (
                <p className="article-auth-hint">
                  Sign in to like.
                </p>
              )}
            </div>

            <form className="article-comment-form" onSubmit={handleSubmitComment}>
              <label htmlFor="article-comment-input">Leave a comment</label>
              <textarea
                id="article-comment-input"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
              <label className="article-anonymous-option">
                <input
                  type="checkbox"
                  checked={isAnonymousComment}
                  onChange={(event) => setIsAnonymousComment(event.target.checked)}
                />
                Post anonymously
              </label>
              <div className="article-comment-action-row">
                <button
                  type="submit"
                  className="article-comment-submit"
                  disabled={isCommentSubmitting}
                >
                  {isCommentSubmitting ? "Posting..." : "Post comment"}
                </button>
                {!currentUser && (
                  <p className="article-auth-hint">
                    Sign in to comment.
                  </p>
                )}
              </div>
            </form>

            <div className="article-comments-list">
              <h3>Comments ({comments.length})</h3>
              {comments.length === 0 ? (
                <p className="article-comments-empty">
                  No comments yet. Be the first to comment.
                </p>
              ) : (
                comments
                  .map((entry, originalIndex) => ({ entry, originalIndex }))
                  .slice()
                  .reverse()
                  .map(({ entry, originalIndex }) => (
                    <article
                      className="article-comment-item"
                      key={`${entry.createdAt}-${entry.userId}-${originalIndex}`}
                    >
                      <div className="article-comment-meta">
                        <strong>{entry.displayName || "Anonymous"}</strong>
                        <span>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {editingCommentIndex === originalIndex ? (
                        <div className="article-comment-edit-block">
                          <textarea
                            value={editingCommentText}
                            onChange={(event) =>
                              setEditingCommentText(event.target.value)
                            }
                            rows={3}
                          />
                          <div className="article-comment-edit-actions">
                            <button
                              type="button"
                              className="article-comment-edit-button"
                              onClick={() =>
                                handleSaveEditedComment(originalIndex)
                              }
                              disabled={isCommentEditing}
                            >
                              {isCommentEditing ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              className="article-comment-cancel-button"
                              onClick={handleCancelEditComment}
                              disabled={isCommentEditing}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{entry.comment}</p>
                          {currentUser?.uid === entry.userId && (
                            <div className="article-comment-owner-actions">
                              <button
                                type="button"
                                className="article-comment-edit-button"
                                onClick={() =>
                                  handleStartEditComment(originalIndex)
                                }
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))
              )}
            </div>
          </section>

          {isAdmin && (
            <div className="admin-buttons">
              <button
                onClick={() => setIsEditing(true)}
                className="edit-button"
              >
                Edit
              </button>

              <button onClick={handleRemove} className="remove-button">
                Remove
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Article;
