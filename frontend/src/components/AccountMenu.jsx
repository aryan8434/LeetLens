import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({ onLogin }) {
  const { currentUser, credits, creditsReady, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) {
    return (
      <button type="button" className="account-login-btn" onClick={onLogin}>
        Log in
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
            onClick={async () => {
              await signOut();
              setOpen(false);
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
