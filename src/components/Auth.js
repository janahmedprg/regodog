import React, { useState, useEffect } from "react";
import { auth, provider } from "../config/firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const Auth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="auth-container">
      {user ? (
        <div className="user-info">
          <p>Welcome, {user.displayName}</p>
          <button className="auth-button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      ) : (
        <button className="auth-button" onClick={handleSignIn}>
          Sign In with Google
        </button>
      )}
    </div>
  );
};

export default Auth;
