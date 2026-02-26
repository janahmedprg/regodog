import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, doc, getDoc, setDoc } from "../config/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { FaPen, FaPlus } from "react-icons/fa";
import "../styles/styles.css";

type EditableField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "phoneNumber"
  | "address";

interface UserInfoForm {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  newsletterOptIn: boolean;
}

const DEFAULT_FORM: UserInfoForm = {
  email: "",
  firstName: "",
  middleName: "",
  lastName: "",
  phoneNumber: "",
  address: "",
  newsletterOptIn: false,
};

const FIELD_LABELS: Record<EditableField, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  phoneNumber: "Phone number",
  address: "Address",
};
const EDITABLE_FIELDS: EditableField[] = [
  "firstName",
  "middleName",
  "lastName",
  "phoneNumber",
  "address",
];

const Account: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<UserInfoForm>({ ...DEFAULT_FORM });
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) {
      setError("Authentication is only available in the browser.");
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsAuthLoading(false);
        navigate("/auth");
        return;
      }
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadUserInfo = async () => {
      setError("");
      setMessage("");
      setIsDataLoading(true);

      try {
        const userDocRef = doc(db, "user-info", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setForm({
            ...DEFAULT_FORM,
            email: user.email ?? "",
          });
          return;
        }

        const data = userDoc.data() as Partial<UserInfoForm>;
        setForm({
          email: data.email ?? user.email ?? "",
          firstName: data.firstName ?? "",
          middleName: data.middleName ?? "",
          lastName: data.lastName ?? "",
          phoneNumber: data.phoneNumber ?? "",
          address: data.address ?? "",
          newsletterOptIn: data.newsletterOptIn ?? false,
        });
      } catch (loadError) {
        console.error("Error loading user info:", loadError);
        setError("Could not load account information. Please refresh and try again.");
      } finally {
        setIsDataLoading(false);
      }
    };

    void loadUserInfo();
  }, [user]);

  const displayName = useMemo(() => {
    if (!user) {
      return "User";
    }

    const fallbackName = user.email?.split("@")[0];
    return user.displayName || fallbackName || "User";
  }, [user]);

  const handleFieldChange = (
    key: EditableField,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const userDocRef = doc(db, "user-info", user.uid);
      await setDoc(
        userDocRef,
        {
          ...form,
          email: user.email ?? form.email ?? "",
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setMessage("Account information saved.");
      setEditingField(null);
    } catch (saveError) {
      console.error("Error saving user info:", saveError);
      setError("Could not save account information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }
    await signOut(auth);
    navigate("/auth");
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p className="auth-feedback">Loading account information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="auth-container account-page-container">
      <div className="auth-card account-card">
        <h1 className="auth-title">Account</h1>
        <p className="auth-subtitle">Signed in as {displayName}</p>

        <div className="account-list">
          <div className="account-row">
            <div className="account-row-header">
              <span className="account-row-label">Email</span>
              <span className="account-readonly-badge">Read only</span>
            </div>
            <p className="account-row-value">{user.email || form.email || "Not set"}</p>
          </div>

          {EDITABLE_FIELDS.map((fieldKey) => (
            <div className="account-row" key={fieldKey}>
              <div className="account-row-header">
                <span className="account-row-label">{FIELD_LABELS[fieldKey]}</span>
                <button
                  type="button"
                  className="auth-button auth-button-secondary account-edit-button"
                  onClick={() =>
                    setEditingField((previous) =>
                      previous === fieldKey ? null : fieldKey,
                    )
                  }
                  aria-label={form[fieldKey] ? `Edit ${FIELD_LABELS[fieldKey]}` : `Add ${FIELD_LABELS[fieldKey]}`}
                  title={form[fieldKey] ? `Edit ${FIELD_LABELS[fieldKey]}` : `Add ${FIELD_LABELS[fieldKey]}`}
                >
                  {form[fieldKey] ? <FaPen aria-hidden="true" /> : <FaPlus aria-hidden="true" />}
                </button>
              </div>

              {editingField === fieldKey ? (
                fieldKey === "address" ? (
                  <textarea
                    className="auth-input account-textarea"
                    value={form.address}
                    onChange={(event) => handleFieldChange("address", event)}
                    rows={3}
                    placeholder="Enter address"
                  />
                ) : (
                  <input
                    className="auth-input"
                    type="text"
                    value={form[fieldKey]}
                    onChange={(event) => handleFieldChange(fieldKey, event)}
                    placeholder={`Enter ${FIELD_LABELS[fieldKey].toLowerCase()}`}
                  />
                )
              ) : (
                <p className="account-row-value">{form[fieldKey] || "Not set"}</p>
              )}
            </div>
          ))}
        </div>

        <div className="newsletter-toggle-row">
          <span className="account-row-label">
            Newsletter: {form.newsletterOptIn ? "Opted in" : "Opted out"}
          </span>
          <button
            type="button"
            className={`newsletter-toggle-button ${form.newsletterOptIn ? "newsletter-toggle-button-on" : ""}`}
            onClick={() =>
              setForm((previous) => ({
                ...previous,
                newsletterOptIn: !previous.newsletterOptIn,
              }))
            }
            aria-pressed={form.newsletterOptIn}
          >
            {form.newsletterOptIn ? "Opt out" : "Opt in"}
          </button>
        </div>

        <button
          type="button"
          className="auth-button auth-button-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>

        {message && <p className="auth-feedback info-text">{message}</p>}
        {error && <p className="auth-feedback error-text">{error}</p>}

        <button
          type="button"
          className="auth-button auth-button-secondary account-signout-button"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Account;
