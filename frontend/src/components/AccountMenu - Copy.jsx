import { useEffect, useMemo, useRef, useState } from "react";
import { updateEmail, updatePassword } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

const CREDIT_PACKAGES = [
  { key: "10_rs19", credits: 10, priceRs: 19, label: "Starter" },
  { key: "20_rs29", credits: 20, priceRs: 29, label: "Practice" },
  { key: "50_rs49", credits: 50, priceRs: 49, label: "Focused" },
  { key: "100_rs79", credits: 100, priceRs: 79, label: "Power" },
];

function getReadableAuthError(error, fallback) {
  const code = error?.code || "";

  if (code === "auth/requires-recent-login") {
    return "Please log out and log in again before changing email or password.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/weak-password") {
    return "Password should be at least 6 characters.";
  }

  if (code === "auth/email-already-in-use") {
    return "That email is already used by another account.";
  }

  return error?.message || fallback;
}

function getInitial(profile, user) {
  const name = profile?.name || user?.displayName || user?.email || "U";
  return name.trim().charAt(0).toUpperCase() || "U";
}

function isPasswordUser(user) {
  return Boolean(
    user?.providerData?.some((provider) => provider.providerId === "password"),
  );
}

function getProviderLabel(user) {
  if (user?.providerData?.some((provider) => provider.providerId === "google.com")) {
    return "Google";
  }

  if (isPasswordUser(user)) {
    return "Email";
  }

  return "Account";
}

export default function AccountMenu({ onLogin }) {
  const {
    currentUser,
    userProfile,
    credits,
    setCredits,
    setUserProfile,
    logout,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    dob: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [buyingPackage, setBuyingPackage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  const canEditCredentials = isPasswordUser(currentUser);
  const providerLabel = getProviderLabel(currentUser);

  const displayName = useMemo(
    () =>
      userProfile?.name ||
      currentUser?.displayName ||
      currentUser?.email?.split("@")[0] ||
      "Learner",
    [currentUser, userProfile],
  );

  useEffect(() => {
    if (!open || !currentUser) {
      return;
    }

    setDraft({
      name: userProfile?.name || currentUser.displayName || "",
      dob: userProfile?.dob || "",
      email: userProfile?.email || currentUser.email || "",
      password: "",
    });
    setStatus("");
    setError("");
  }, [currentUser, open, userProfile]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const getAuthHeaders = async () => {
    const token = await currentUser.getIdToken(true);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const nextEmail = draft.email.trim();
      if (
        canEditCredentials &&
        nextEmail &&
        nextEmail !== currentUser.email
      ) {
        await updateEmail(currentUser, nextEmail);
      }

      if (canEditCredentials && draft.password.trim()) {
        await updatePassword(currentUser, draft.password.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          name: draft.name,
          dob: draft.dob,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile.");
      }

      setUserProfile(data.user);
      if (typeof data.credits === "number") {
        setCredits(data.credits);
      }
      setDraft((value) => ({ ...value, password: "" }));
      setStatus("Profile saved.");
    } catch (profileError) {
      setError(getReadableAuthError(profileError, "Unable to save profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleMockPurchase = async (packageKey) => {
    if (!currentUser) {
      onLogin();
      return;
    }

    setBuyingPackage(packageKey);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/credits/purchase`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ packageKey }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add credits.");
      }

      setCredits(data.credits);
      setUserProfile(data.user);
      setStatus(
        `Mock purchase complete: ${data.addedCredits} credits added for Rs ${data.amountRs}.`,
      );
    } catch (purchaseError) {
      setError(purchaseError.message || "Unable to add credits.");
    } finally {
      setBuyingPackage("");
    }
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-trigger"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <section className="account-panel" aria-label="Account panel">
          {!currentUser ? (
            <div className="account-empty">
              <h2>Account</h2>
              <p>Log in to manage your profile and search credits.</p>
              <button
                type="button"
                className="account-primary"
                onClick={() => {
                  setOpen(false);
                  onLogin();
                }}
              >
                Login / Sign Up
              </button>
            </div>
          ) : (
            <>
              <div className="account-summary">
                <div className="account-avatar">
                  {getInitial(userProfile, currentUser)}
                </div>
                <div>
                  <p className="account-kicker">{providerLabel} account</p>
                  <h2>{displayName}</h2>
                  <p>{userProfile?.email || currentUser.email}</p>
                </div>
              </div>

              <form className="account-form" onSubmit={handleSaveProfile}>
                <div className="account-section-head">
                  <span>Profile</span>
                  <strong>{credits} credits</strong>
                </div>

                <label className="account-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Your name"
                  />
                </label>

                <label className="account-field">
                  <span>Date of birth</span>
                  <input
                    type="date"
                    value={draft.dob}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        dob: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="account-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    readOnly={!canEditCredentials}
                    onChange={(event) =>
                      setDraft((value) => ({
                        ...value,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>

                {canEditCredentials ? (
                  <label className="account-field">
                    <span>New password</span>
                    <input
                      type="password"
                      value={draft.password}
                      onChange={(event) =>
                        setDraft((value) => ({
                          ...value,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Leave blank to keep current password"
                    />
                  </label>
                ) : (
                  <p className="account-note">
                    Password changes are managed through your Google account.
                  </p>
                )}

                <button
                  type="submit"
                  className="account-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </form>

              <div className="account-credits">
                <div className="account-section-head">
                  <span>Credits</span>
                  <strong>Mock buy</strong>
                </div>

                <div className="credit-package-grid">
                  {CREDIT_PACKAGES.map((item) => (
                    <button
                      type="button"
                      className="credit-package"
                      key={item.key}
                      disabled={Boolean(buyingPackage)}
                      onClick={() => handleMockPurchase(item.key)}
                    >
                      <span>{item.label}</span>
                      <strong>{item.credits} credits</strong>
                      <small>
                        {buyingPackage === item.key
                          ? "Adding..."
                          : `Rs ${item.priceRs}`}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              {status ? <p className="account-status">{status}</p> : null}
              {error ? <p className="account-error">{error}</p> : null}

              <button
                type="button"
                className="account-logout"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
