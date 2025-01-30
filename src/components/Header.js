import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/styles.css";

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/auth"); // Redirect to auth page after signing out
  };
  return (
    <div className="header">
      <Link to="/" style={{ textDecoration: "none", color: "black" }}>
        <h1 className="title">REGODOG</h1>
      </Link>
      <div className="separator"></div>
      <nav className="nav">
        <span>THE CZECH RESTAURANT</span>
        <span>STANDARD SCHNAUZER</span>
        <span>THE FARMHOUSE & FARM</span>
        <span>ANYTHING</span>
        <span>THE SHOP</span>
        {user ? (
          <button className="auth-button" onClick={handleSignOut}>
            Sign Out
          </button>
        ) : (
          <Link to="/auth" className="auth-button">
            Sign In
          </Link>
        )}
      </nav>
    </div>
  );
};
export default Header;
