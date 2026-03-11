import React, { useState } from "react";
import "../styles/styles.css";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import logo from "../logo.svg";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmailError, setShowEmailError] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    if (showEmailError) {
      const trimmed = value.trim();
      setEmailError(
        trimmed && !isValidEmail(trimmed) ? "Please enter a valid email." : "",
      );
      return;
    }

    setEmailError("");
  };

  const onEmailBlur = () => {
    const trimmed = email.trim();
    setShowEmailError(true);
    if (!trimmed) {
      setEmailError("");
      return;
    }

    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email.");
    } else {
      setEmailError("");
    }
  };

  const sendContactMessage = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const senderEmail = email.trim();
    const messageSubject = subject.trim();
    const messageText = message.trim();

    if (!senderEmail || !messageSubject || !messageText) {
      setStatusType("error");
      setStatusMessage("Please fill out all fields.");
      return;
    }

    if (!isValidEmail(senderEmail)) {
      setShowEmailError(true);
      setStatusType("error");
      setStatusMessage("Please enter a valid email.");
      setEmailError("Please enter a valid email.");
      return;
    }

    const configuredFunctionBaseUrl =
      import.meta.env.VITE_FIREBASE_FUNCTION_BASE_URL?.replace(/\/$/, "");
    const functionBaseUrl = configuredFunctionBaseUrl
      ? `${configuredFunctionBaseUrl}/sendContactMessage`
      : import.meta.env.VITE_FIREBASE_PROJECT_ID
        ? `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendContactMessage`
        : "/sendContactMessage";

    setIsSending(true);
    setStatusType("idle");
    setStatusMessage("");

    try {
      const response = await fetch(functionBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: senderEmail,
          subject: messageSubject,
          message: messageText,
        }),
      });

      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          responseBody?.error ??
            "Something went wrong while sending your message.",
        );
      }

      setStatusType("success");
      setStatusMessage("Message sent. We will get back to you soon.");
      setEmail("");
      setEmailError("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatusType("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to send message. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

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
          <div className="footer-policy-row">
            <Link to="/privacy-policy" className="footer-link">
              Privacy Policy
            </Link>
            <button
              type="button"
              className="footer-dropdown-toggle"
              onClick={() => setIsContactOpen((prev) => !prev)}
              aria-expanded={isContactOpen}
              aria-controls="footer-contact-dropdown"
            >
              Contact
              <span className="footer-dropdown-caret">
                {isContactOpen ? "▾" : "▸"}
              </span>
            </button>
          </div>
        </div>
        {isContactOpen && (
          <div id="footer-contact-dropdown" className="footer-contact">
            <div className="footer-contact-title">Contact us</div>
            <form className="footer-contact-form" onSubmit={sendContactMessage}>
              <input
                type="email"
                className={`footer-contact-input ${
                  showEmailError && emailError
                    ? "footer-contact-input-error"
                    : ""
                }`}
                placeholder="Your email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onBlur={onEmailBlur}
                required
              />
              {showEmailError && emailError && (
                <div className="footer-contact-feedback footer-contact-feedback-error">
                  {emailError}
                </div>
              )}
              <input
                type="text"
                className="footer-contact-input"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <textarea
                className="footer-contact-textarea"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
              <button
                type="submit"
                className="footer-contact-button"
                disabled={
                  isSending ||
                  (showEmailError && Boolean(emailError)) ||
                  !isValidEmail(email.trim()) ||
                  !email.trim() ||
                  !subject.trim() ||
                  !message.trim()
                }
              >
                {isSending ? "Sending..." : "Send Message"}
              </button>
            </form>
            {statusMessage && (
              <div
                className={`footer-contact-feedback ${
                  statusType === "error"
                    ? "footer-contact-feedback-error"
                    : "footer-contact-feedback-success"
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>
        )}
        <div className="footer-copyright">
          Copyright {new Date().getFullYear()}, Regodog - All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
