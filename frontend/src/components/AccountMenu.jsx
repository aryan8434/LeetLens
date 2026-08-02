import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({
  onLogin,
  onProfileClick,
  onCreditsClick,
  onHistoryClick,
  onResumeClick,
  theme,
  onToggleTheme,
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

            {onToggleTheme && (
              <button
                type="button"
                className="popover-item-premium"
                onClick={() => {
                  onToggleTheme();
                }}
              >
                {theme === "dark" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
                <span>Theme: {theme === "dark" ? "Dark 🌙" : "Light ☀️"}</span>
              </button>
            )}

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
