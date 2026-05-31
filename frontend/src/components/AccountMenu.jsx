import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({
  onLogin,
  onProfileClick,
  onCreditsClick,
  onHistoryClick,
}) {
  const { currentUser, userProfile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

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

  if (!currentUser) {
    return (
      <button type="button" className="account-login-btn" onClick={onLogin}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            marginRight: "0.4rem",
          }}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Log in</span>
      </button>
    );
  }

  const greetingName = userProfile?.name || currentUser.displayName || "";
  const initialChar = (greetingName || currentUser.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="account-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger-premium"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt="profile"
            className="avatar-img-premium"
          />
        ) : (
          <div className="avatar-initial-premium">{initialChar}</div>
        )}
        <span className="greeting-text-premium">
          {greetingName ? `Hello, ${greetingName}` : "Hello"}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`arrow-icon-premium ${open ? "open" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="account-menu-popover-premium">
          <div className="popover-header-premium">
            <p className="popover-email-premium">{currentUser.email}</p>
          </div>
          <div className="popover-links-premium">
            <button
              type="button"
              className="popover-item-premium"
              onClick={() => {
                onProfileClick?.();
                setOpen(false);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>My Profile</span>
            </button>

            <button
              type="button"
              className="popover-item-premium"
              onClick={() => {
                onCreditsClick?.();
                setOpen(false);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Credits</span>
            </button>

            <button
              type="button"
              className="popover-item-premium"
              onClick={() => {
                onHistoryClick?.();
                setOpen(false);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h3l3 8 4-16 3 8h3" />
              </svg>
              <span>History</span>
            </button>

            <hr className="popover-divider-premium" />

            <button
              type="button"
              className="popover-item-premium signout"
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
