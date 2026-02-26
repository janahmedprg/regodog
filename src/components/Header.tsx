import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { FaRegUser } from "react-icons/fa";
import "../styles/styles.css";
import logo from "../logo.svg";
import { HeaderTags } from "./HeaderTags";

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

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

  const getUserName = (currentUser: User | null) => {
    if (!currentUser) {
      return "";
    }
    return currentUser.displayName || currentUser.email?.split("@")[0] || "Account";
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
          <Link
            to="/account"
            className="auth-button header-auth-button header-account-button"
            aria-label="Open account page"
          >
            <FaRegUser aria-hidden="true" />
            <span className="header-account-name">{getUserName(user)}</span>
          </Link>
        ) : (
          <Link
            to="/auth"
            className="auth-button header-auth-button header-auth-icon-button"
            aria-label="Sign in or sign up"
          >
            <FaRegUser aria-hidden="true" />
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
                  <Link
                    to="/account"
                    className="auth-button header-auth-button mobile-auth-button header-account-button"
                    onClick={closeMenu}
                    aria-label="Open account page"
                  >
                    <FaRegUser aria-hidden="true" />
                    <span className="header-account-name">{getUserName(user)}</span>
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="auth-button header-auth-button mobile-auth-button header-auth-icon-button"
                    onClick={closeMenu}
                    aria-label="Sign in or sign up"
                  >
                    <FaRegUser aria-hidden="true" />
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
