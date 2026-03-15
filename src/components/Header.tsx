import React, { useEffect, useState, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth" || location.pathname.startsWith("/auth/");
  const isAccountPage = location.pathname === "/account" || location.pathname.startsWith("/account/");

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
          <NavLink
            key={tag}
            to={`/${tag}`}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link--active" : ""}`.trim()
            }
          >
            {tag.replace("_", " ").toUpperCase()}
          </NavLink>
        ))}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `nav-link ${isActive ? "nav-link--active" : ""}`.trim()
          }
        >
          SHOP
        </NavLink>
      </nav>
      <div
        className={`auth-container-desktop ${isMobile ? "auth-container-desktop-hidden" : ""}`}
        style={{ paddingTop: "28px" }}
      >
        {user ? (
          <Link
            to="/account"
            className={`auth-button header-auth-button header-account-button ${
              isAccountPage ? "header-account-button--active" : ""
            }`.trim()}
            aria-label="Open account page"
          >
            <FaRegUser aria-hidden="true" />
            <span className="header-account-name">{getUserName(user)}</span>
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`auth-button header-auth-button header-auth-icon-button ${
              isAuthPage ? "header-auth-icon-button--active" : ""
            }`.trim()}
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
                <NavLink
                  key={tag}
                  to={`/${tag}`}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? "mobile-nav-link--active" : ""}`.trim()
                  }
                  onClick={closeMenu}
                >
                  {tag.replace("_", " ").toUpperCase()}
                </NavLink>
              ))}
              <NavLink
                to="/shop"
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "mobile-nav-link--active" : ""}`.trim()
                }
                onClick={closeMenu}
              >
                SHOP
              </NavLink>
              <div className="mobile-auth-container">
                {user ? (
                  <Link
                    to="/account"
                    className={`auth-button header-auth-button mobile-auth-button header-account-button ${
                      isAccountPage ? "header-account-button--active" : ""
                    }`.trim()}
                    onClick={closeMenu}
                    aria-label="Open account page"
                  >
                    <FaRegUser aria-hidden="true" />
                    <span className="header-account-name">{getUserName(user)}</span>
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className={`auth-button header-auth-button mobile-auth-button header-auth-icon-button ${
                      isAuthPage ? "header-auth-icon-button--active" : ""
                    }`.trim()}
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
