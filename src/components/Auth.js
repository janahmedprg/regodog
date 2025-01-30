import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../config/firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import "../styles/styles.css";

const Auth = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (currentUser.emailVerified) {
          setUser(currentUser);
          setTimeout(() => navigate("/"), 2000); // Redirect after 2 seconds
        } else {
          setMessage("Please verify your email before signing in.");
          signOut(auth);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (!result.user.emailVerified) {
        setMessage("Please verify your email before signing in.");
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignInWithEmail = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (userCredential.user.emailVerified) {
        setMessage("Welcome! Redirecting...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage("Please verify your email before signing in.");
        await signOut(auth);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignUpWithEmail = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(userCredential.user);
      setMessage("Verification email sent! Please check your inbox.");
      setEmail("");
      setPassword("");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="auth-container">
      {user ? (
        <div className="user-info">
          <p>Welcome, {user.displayName || user.email}</p>
          <p>Redirecting to main page...</p>
        </div>
      ) : (
        <div>
          <button
            className="auth-button google-signin"
            onClick={handleSignInWithGoogle}
          >
            Sign In with Google
          </button>

          <form className="auth-form" onSubmit={handleSignInWithEmail}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="auth-button">
              Sign In
            </button>
            <button
              type="button"
              className="auth-button signup"
              onClick={handleSignUpWithEmail}
            >
              Sign Up
            </button>
          </form>

          {message && <p className="info-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Auth;
