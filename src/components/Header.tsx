import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import "../styles/styles.css";
import logo from "../logo.svg";
import { HeaderTags } from "./HeaderTags";

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/auth");
  };

  const nav = document.querySelector(".header-nav") as HTMLDivElement;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 5) {
      nav.style.backgroundColor = "rgba(243, 240, 236, 0.3)";
      nav.style.backdropFilter = "blur(10px)";
    } else {
      nav.style.backgroundColor = "rgb(243, 240, 236)";
    }
  });

  return (
    <header className="header-nav">
      <Link
        to="/"
        style={{
          textDecoration: "none",
          margin: "0px",
        }}
        className="logo-a"
      >
        <div className="logo-container">
          <img src={logo} alt="REGODOG Logo" className="logo" />
        </div>
      </Link>
      <nav className="nav">
        {Object.values(HeaderTags).map((tag: string) => (
          <Link key={tag} to={`/${tag}`} className="nav-link">
            {tag.replace("_", " ").toUpperCase()}
          </Link>
        ))}
        <Link to="/shop" className="nav-link">
          SHOP
        </Link>
      </nav>
      <div style={{ paddingTop: "28px" }}>
        {user ? (
          <button className="auth-button" onClick={handleSignOut}>
            Sign Out
          </button>
        ) : (
          <Link to="/auth" className="auth-button">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
