import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  db,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  auth,
  collection,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "../config/firebase"; // Import Firestore utilities
import { onAuthStateChanged } from "firebase/auth";
import "../styles/styles.css"; // Import CSS for styling
import "../styles/tags.css";
import Editor from "./Editor";
// import { createEditor, $getRoot } from "lexical";
// import { $createParagraphNode, $createTextNode } from "lexical";

const Article = () => {
  // Create a default editor state with a paragraph node
  // const createDefaultEditorState = () => {
  //   const editor = createEditor();
  //   let editorState = null;
  //   editor.update(() => {
  //     const root = $getRoot();
  //     const paragraph = $createParagraphNode();
  //     const text = $createTextNode("Start writing your article...");
  //     paragraph.append(text);
  //     root.append(paragraph);
  //     editorState = editor.getEditorState();
  //   });
  //   return editorState;
  // };

  const { id } = useParams(); // Get article ID from URL
  const navigate = useNavigate(); // For redirection
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // State to check if the user is an admin
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  const [editedTitle, setEditedTitle] = useState(""); // State for edited title
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const availableTags = [
    "bakery",
    "standard_schnauzer",
    "farm_house",
    "anything",
  ];

  const handleTagChange = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch article data
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticle(data);
          setEditedTitle(data.title);
          setSelectedTags(data.tags || []);
          setImagePreview(data.thumbnailUrl || null);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      }
      setLoading(false);
    };

    fetchArticle();
  }, [id]);

  // Check if the user is an admin
  useEffect(() => {
    const checkIfAdmin = async (userId) => {
      try {
        const querySnapshot = await getDocs(collection(db, "check-admin"));
        const isAdmin = querySnapshot.docs.some(
          (doc) => doc.data().id === userId
        );
        return isAdmin;
      } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdmin = await checkIfAdmin(user.uid);
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false); // User is not logged in
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Handle save button click
  const handleSave = async (editorState, htmlContent) => {
    if (!editorState) {
      console.error("No editor state to save");
      return;
    }

    try {
      // The editorState is already serialized as a JSON string from the Editor component
      const serializedState = editorState;

      let updateData = {
        title: editedTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        lastUpdated: new Date(),
      };

      // Upload new image if selected
      if (selectedImage) {
        const imageRef = ref(
          storage,
          `thumbnails/${Date.now()}_${selectedImage.name}`
        );
        const snapshot = await uploadBytes(imageRef, selectedImage);
        const thumbnailUrl = await getDownloadURL(snapshot.ref);
        updateData.thumbnailUrl = thumbnailUrl;
      }

      // Update Firebase
      const docRef = doc(db, "news", id);
      await updateDoc(docRef, updateData);

      // Update local state
      setArticle((prev) => ({
        ...prev,
        title: editedTitle,
        editorState: serializedState,
        htmlContent: htmlContent,
        tags: selectedTags,
        thumbnailUrl: updateData.thumbnailUrl || prev.thumbnailUrl,
      }));

      setIsEditing(false);
      setSelectedImage(null);
      console.log("Article updated successfully!");
    } catch (error) {
      console.error("Error updating article:", error);
      alert("Failed to save article. Please try again.");
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(article.title);
    setSelectedTags(article.tags || []);
    setSelectedImage(null);
    setImagePreview(article.thumbnailUrl || null);
  };

  // Handle remove button click
  const handleRemove = async () => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      try {
        const docRef = doc(db, "news", id);

        // Get the article data to check if it has a thumbnail
        const articleDoc = await getDoc(docRef);
        const articleData = articleDoc.data();

        // Delete the thumbnail from storage if it exists
        if (articleData && articleData.thumbnailUrl) {
          try {
            const imageRef = ref(storage, articleData.thumbnailUrl);
            await deleteObject(imageRef);
          } catch (storageError) {
            console.error(
              "Error deleting thumbnail from storage:",
              storageError
            );
          }
        }

        await deleteDoc(docRef);
        console.log("Article removed successfully!");

        // Redirect to homepage
        navigate("/");
      } catch (error) {
        console.error("Error removing article:", error);
        alert("Failed to remove article. Please try again.");
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading article...</div>;
  }

  if (!article) {
    return <div className="error">Article not found</div>;
  }

  return (
    <div className="article-container">
      {isEditing ? (
        // Edit mode
        <div className="edit-mode">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="edit-input"
            placeholder="Article Title"
          />
          <div className="image-upload-section">
            <h3>Thumbnail Image:</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Thumbnail preview" />
              </div>
            )}
          </div>
          <div className="tags-section">
            <h3>Select Tags:</h3>
            <div className="tags-container">
              {availableTags.map((tag) => (
                <label key={tag} className="tag-label">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagChange(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
          <Editor
            initialEditorState={article.editorState}
            onSave={handleSave}
          />
          <div className="edit-buttons">
            <button onClick={handleCancel} className="edit-cancel-button">
              Discard Changes
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          {article.thumbnailUrl && (
            <div className="article-thumbnail">
              <img src={article.thumbnailUrl} alt="Article thumbnail" />
            </div>
          )}
          <h1 className="article-title">{article.title}</h1>
          <div className="article-tags">
            {article.tags &&
              article.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
          </div>
          <div className="article-content">
            {article.htmlContent ? (
              <div
                className="article-html-content"
                dangerouslySetInnerHTML={{ __html: article.htmlContent }}
                style={{ maxWidth: "100%", overflow: "hidden" }}
              />
            ) : (
              <p>{article.content}</p>
            )}
          </div>
          {isAdmin && (
            <div className="admin-buttons">
              <button onClick={handleEdit} className="edit-button">
                Edit Article
              </button>
              <button onClick={handleRemove} className="remove-button">
                Remove Article
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Article;
