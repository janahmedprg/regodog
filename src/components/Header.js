import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/styles.css";
import logo from "../logo.svg";

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
    navigate("/auth");
  };

  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: "none" }}>
        <div className="logo-container">
          <img src={logo} alt="REGODOG Logo" className="logo" />
        </div>
      </Link>
      <div className="separator"></div>
      <nav className="nav">
        <Link to="/bakery" className="nav-link">
          BAKERY
        </Link>
        <Link to="/standard_schnauzer" className="nav-link">
          STANDARD SCHNAUZER
        </Link>
        <Link to="/farm_house" className="nav-link">
          THE FARMHOUSE & FARM
        </Link>
        <Link to="/anything" className="nav-link">
          ANYTHING
        </Link>
        <Link to="/shop" className="nav-link">
          THE SHOP
        </Link>
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
    </header>
  );
};

export default Header;
