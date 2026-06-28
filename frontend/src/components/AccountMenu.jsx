import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({
  onLogin,
  onProfileClick,
  onCreditsClick,
  onHistoryClick,
  onLinkedinClick,
  onResumeClick,
}) {
  const { currentUser, userProfile, credits, signOut } = useAuth();
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
              <span>Credits: {credits} left</span>
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
              <span>Evaluation History</span>
            </button>

            <button
              type="button"
              className="popover-item-premium"
              onClick={() => {
                onLinkedinClick?.();
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
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span>LinkedIn Analyzer</span>
            </button>

            <button
              type="button"
              className="popover-item-premium"
              onClick={() => {
                onResumeClick?.();
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Resume Analyzer</span>
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
