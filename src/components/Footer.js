import React from "react";
import "../styles/styles.css";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import logo from "../logo.svg";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <Link to="/" style={{ textDecoration: "none" }}>
          <div className="logo-container">
            <img src={logo} alt="REGODOG Logo" className="logo" />
          </div>
        </Link>
        <div className="footer-links">
          <div className="footer-nav">
            <a
              href="https://www.facebook.com/rjneiman"
              className="footer-nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebook />
            </a>
            <a
              href="https://www.instagram.com/rego_dog"
              className="footer-nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram />
            </a>
            <a
              href="mailto:rjneiman@gmail.com"
              className="footer-nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IoIosMail />
            </a>
          </div>
        </div>
        <div className="footer-copyright">
          Copyright {new Date().getFullYear()}, Regodog - All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
