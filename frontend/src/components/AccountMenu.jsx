import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({ onLogin, onProfileClick }) {
  const { currentUser, credits, creditsReady, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) {
    return (
      <button type="button" className="account-login-btn" onClick={onLogin}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Log in</span>
      </button>
    );
  }

  return (
    <div className="account-menu-wrap">
      <button
        type="button"
        className="account-menu-btn"
        onClick={() => setOpen((value) => !value)}
      >
        {currentUser.email || "Account"} ·{" "}
        {creditsReady ? `${credits} credits` : "Loading credits..."}
      </button>
      {open ? (
        <div className="account-menu-popover">
          <p>{currentUser.email}</p>
          <p>{creditsReady ? `${credits} credits remaining` : "Loading credits..."}</p>
          <button
            type="button"
            className="profile-btn"
            onClick={() => {
              onProfileClick?.();
              setOpen(false);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My Profile
          </button>
          <button
            type="button"
            className="signout-btn"
            onClick={async () => {
              await signOut();
              setOpen(false);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
