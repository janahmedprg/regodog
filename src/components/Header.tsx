import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import "../styles/styles.css";
import logo from "../logo.svg";
import { HeaderTags } from "./HeaderTags";

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 1050);
      if (window.innerWidth >= 1050) {
        setIsMenuOpen(false);
      }
    };

    checkWindowSize();
    window.addEventListener("resize", checkWindowSize);
    return () => window.removeEventListener("resize", checkWindowSize);
  }, []);

  useEffect(() => {
    const nav = headerRef.current;
    if (!nav) return;

    const handleScroll = () => {
      if (window.scrollY > 5) {
        nav.style.backgroundColor = "rgba(243, 240, 236, 0.5)";
        nav.style.backdropFilter = "blur(20px)";
      } else {
        nav.style.backgroundColor = "rgb(243, 240, 236)";
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/auth");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="header-nav" ref={headerRef}>
      <Link
        to="/"
        style={{
          textDecoration: "none",
          margin: "0px",
        }}
        className="logo-a"
        onClick={closeMenu}
      >
        <div className="logo-container">
          <img src={logo} alt="REGODOG Logo" className="logo" />
        </div>
      </Link>
      <nav className={`nav ${isMobile ? "nav-mobile-hidden" : ""}`}>
        {Object.values(HeaderTags).map((tag: string) => (
          <Link key={tag} to={`/${tag}`} className="nav-link">
            {tag.replace("_", " ").toUpperCase()}
          </Link>
        ))}
        <Link to="/shop" className="nav-link">
          SHOP
        </Link>
      </nav>
      <div
        className={`auth-container-desktop ${isMobile ? "auth-container-desktop-hidden" : ""}`}
        style={{ paddingTop: "28px" }}
      >
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
      {isMobile && (
        <>
          <button
            className="hamburger-button"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span
              className={`hamburger-line ${isMenuOpen ? "hamburger-line-open" : ""}`}
            ></span>
            <span
              className={`hamburger-line ${isMenuOpen ? "hamburger-line-open" : ""}`}
            ></span>
            <span
              className={`hamburger-line ${isMenuOpen ? "hamburger-line-open" : ""}`}
            ></span>
          </button>
          {isMenuOpen && (
            <div className="mobile-menu-overlay" onClick={closeMenu}></div>
          )}
          <div
            className={`mobile-menu ${isMenuOpen ? "mobile-menu-open" : ""}`}
          >
            <nav className="mobile-nav">
              {Object.values(HeaderTags).map((tag: string) => (
                <Link
                  key={tag}
                  to={`/${tag}`}
                  className="mobile-nav-link"
                  onClick={closeMenu}
                >
                  {tag.replace("_", " ").toUpperCase()}
                </Link>
              ))}
              <Link to="/shop" className="mobile-nav-link" onClick={closeMenu}>
                SHOP
              </Link>
              <div className="mobile-auth-container">
                {user ? (
                  <button
                    className="auth-button mobile-auth-button"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="auth-button mobile-auth-button"
                    onClick={closeMenu}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
