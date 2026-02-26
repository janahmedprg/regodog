import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../config/firebase";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import "../styles/styles.css";

const AuthAction: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const mode = searchParams.get("mode") ?? "";
  const oobCode = searchParams.get("oobCode") ?? "";
  const isPasswordReset = mode === "resetPassword" || (!!oobCode && !mode);
  const isEmailVerification = mode === "verifyEmail";

  useEffect(() => {
    let isMounted = true;

    async function handleAction() {
      if (!auth) {
        if (isMounted) {
          setError("Authentication is only available in the browser.");
        }
        return;
      }

      if (!oobCode) {
        if (isMounted) {
          setError("This action link is invalid. Please request a new link.");
        }
        return;
      }

      if (isPasswordReset) {
        try {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          if (isMounted) {
            setEmail(userEmail);
            setIsReady(true);
          }
        } catch {
          if (isMounted) {
            setError("This reset link is invalid or has expired. Request a new password reset.");
          }
        }
        return;
      }

      if (isEmailVerification) {
        try {
          await applyActionCode(auth, oobCode);
          if (isMounted) {
            setMessage("Email verified successfully. You can sign in now.");
          }
        } catch {
          if (isMounted) {
            setError("This verification link is invalid or has expired. Request a new one.");
          }
        }
        return;
      }

      if (isMounted) {
        setError(`Unsupported auth action: ${mode}`);
      }
    }

    void handleAction();

    return () => {
      isMounted = false;
    };
  }, [isEmailVerification, isPasswordReset, mode, oobCode]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Authentication is only available in the browser.");
      return;
    }

    if (!oobCode) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("Password updated successfully. Redirecting to sign in...");
      setTimeout(() => navigate("/auth"), 1600);
    } catch {
      setError("Could not reset password. Please request a new reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {isPasswordReset
            ? "Reset password"
            : isEmailVerification
              ? "Verify email"
              : "Auth action"}
        </h1>

        {isPasswordReset && (
          <p className="auth-subtitle">Reset password for user: {email || "..."}</p>
        )}

        {isPasswordReset && isReady ? (
          <form className="auth-form" onSubmit={handlePasswordResetSubmit}>
            <label className="auth-label" htmlFor="new-password">
              New Password
            </label>
            <input
              id="new-password"
              className="auth-input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <label className="auth-label" htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              className="auth-input"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              className="auth-button auth-button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : isPasswordReset ? (
          <p className="auth-feedback">Checking reset link...</p>
        ) : !message && !error ? (
          <p className="auth-feedback">Processing action link...</p>
        ) : null}

        {(message || error) && (
          <button
            type="button"
            className="auth-text-link"
            onClick={() => navigate("/auth")}
          >
            Go to sign in
          </button>
        )}

        {message && <p className="auth-feedback info-text">{message}</p>}
        {error && <p className="auth-feedback error-text">{error}</p>}
      </div>
    </div>
  );
};

export default AuthAction;
