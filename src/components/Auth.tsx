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
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import "../styles/styles.css";

function getErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);
  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials"
  ) {
    return "Incorrect email or password.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (error instanceof Error) {
    return error.message
      .replace("Firebase: ", "")
      .replace(/\s*\(auth\/.*\)\.?$/, ".");
  }
  return "Something went wrong. Please try again.";
}

function getAuthErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

interface AuthProps {
  initialView?: "signin" | "signup" | "forgot";
}

const Auth: React.FC<AuthProps> = ({ initialView = "signin" }) => {
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">(
    initialView,
  );
  const [user, setUser] = useState<User | null>(null);
  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);
  const [signUpEmail, setSignUpEmail] = useState<string>("");
  const [signUpPassword, setSignUpPassword] = useState<string>("");
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] =
    useState<string>("");
  const [showSignUpPasswords, setShowSignUpPasswords] =
    useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthMode(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
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
    if (!auth || !provider) {
      setError("Authentication is only available in the browser.");
      return;
    }

    try {
      setError("");
      setMessage("");
      const result = await signInWithPopup(auth, provider);
      if (!result.user.emailVerified) {
        setMessage("Please verify your email before signing in.");
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Authentication is only available in the browser.");
      return;
    }

    setIsSigningIn(true);
    setError("");
    setMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        signInEmail,
        signInPassword,
      );
      if (userCredential.user.emailVerified) {
        setMessage("Welcome! Redirecting...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage("Please verify your email before signing in.");
        await signOut(auth);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Authentication is only available in the browser.");
      return;
    }

    if (signUpPassword !== signUpPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signUpEmail.trim(),
        signUpPassword,
      );
      await sendEmailVerification(userCredential.user);
      setMessage("Verification email sent! Please check your inbox.");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpPasswordConfirm("");
      setAuthMode("signin");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Authentication is only available in the browser.");
      return;
    }

    try {
      setError("");
      await sendPasswordResetEmail(auth, resetEmail.trim(), {
        url: "https://regodog.com/auth/reset-password",
        handleCodeInApp: false,
      });
      setMessage("Password reset email sent. Please check your inbox.");
      setResetEmail("");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  const switchAuthView = (view: "signin" | "signup" | "forgot") => {
    setAuthMode(view);
    setError("");
    setMessage("");
    if (view === "forgot") {
      navigate("/auth/forgot-password");
      return;
    }
    navigate("/auth");
  };

  return (
    <div className="auth-container">
      {user ? (
        <div className="user-info">
          <p>Welcome, {user.displayName || user.email}</p>
          <p>Redirecting to main page...</p>
        </div>
      ) : (
        <div className="auth-card">
          <h1 className="auth-title">
            {authMode === "signin"
              ? "Sign in"
              : authMode === "signup"
                ? "Create account"
                : "Reset password"}
          </h1>
          <p className="auth-subtitle">
            {authMode === "signin"
              ? "Welcome back. Sign in to continue."
              : authMode === "signup"
                ? "Set up your account with matching email and password fields."
                : "Enter your account email and we will send a reset link."}
          </p>

          {authMode !== "forgot" && (
            <div
              className="auth-mode-toggle"
              role="tablist"
              aria-label="Auth mode"
            >
              <button
                type="button"
                role="tab"
                className={`auth-mode-button ${authMode === "signin" ? "auth-mode-button-active" : ""}`}
                onClick={() => switchAuthView("signin")}
                aria-selected={authMode === "signin"}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                className={`auth-mode-button ${authMode === "signup" ? "auth-mode-button-active" : ""}`}
                onClick={() => switchAuthView("signup")}
                aria-selected={authMode === "signup"}
              >
                Create Account
              </button>
            </div>
          )}

          {authMode === "signin" ? (
            <>
              <form className="auth-form" onSubmit={handleSignInWithEmail}>
                <label className="auth-label" htmlFor="signin-email">
                  Email
                </label>
                <input
                  id="signin-email"
                  className="auth-input"
                  type="email"
                  placeholder="Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <label className="auth-label" htmlFor="signin-password">
                  Password
                </label>
                <input
                  id="signin-password"
                  className="auth-input"
                  type={showSignInPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <label
                  className="auth-checkbox-row"
                  htmlFor="signin-show-password"
                >
                  <input
                    id="signin-show-password"
                    type="checkbox"
                    checked={showSignInPassword}
                    onChange={(e) => setShowSignInPassword(e.target.checked)}
                  />
                  <span>Show password</span>
                </label>

                <button
                  type="submit"
                  className="auth-button auth-button-primary"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <span className="auth-button-loading">
                      <span className="auth-spinner" aria-hidden="true" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => switchAuthView("forgot")}
                >
                  Forgot password?
                </button>
              </form>

              <div className="auth-divider">
                <span>or continue with Google</span>
              </div>

              <button
                className="auth-button google-signin"
                onClick={handleSignInWithGoogle}
              >
                <FcGoogle className="google-signin-icon" aria-hidden="true" />
                <span>Continue with Google</span>
              </button>
            </>
          ) : authMode === "forgot" ? (
            <form className="auth-form" onSubmit={handlePasswordReset}>
              <label className="auth-label" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                className="auth-input"
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button type="submit" className="auth-button auth-button-primary">
                Send Reset Link
              </button>
              <button
                type="button"
                className="auth-text-link"
                onClick={() => switchAuthView("signin")}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleSignUpWithEmail}>
                <label className="auth-label" htmlFor="signup-email">
                  Email
                </label>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  placeholder="Email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <label className="auth-label" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  className="auth-input"
                  type={showSignUpPasswords ? "text" : "password"}
                  placeholder="Password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <label className="auth-label" htmlFor="signup-password-confirm">
                  Confirm Password
                </label>
                <input
                  id="signup-password-confirm"
                  className="auth-input"
                  type={showSignUpPasswords ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={signUpPasswordConfirm}
                  onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <label
                  className="auth-checkbox-row"
                  htmlFor="signup-show-password"
                >
                  <input
                    id="signup-show-password"
                    type="checkbox"
                    checked={showSignUpPasswords}
                    onChange={(e) => setShowSignUpPasswords(e.target.checked)}
                  />
                  <span>Show password</span>
                </label>

                <button
                  type="submit"
                  className="auth-button auth-button-primary"
                >
                  Create Account
                </button>
              </form>

              <div className="auth-divider">
                <span>or continue with Google</span>
              </div>

              <button
                className="auth-button google-signin"
                onClick={handleSignInWithGoogle}
              >
                <FcGoogle className="google-signin-icon" aria-hidden="true" />
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {message && <p className="auth-feedback info-text">{message}</p>}
          {error && <p className="auth-feedback error-text">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Auth;
