import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

export default function CreditsPage({ onBack }) {
  const { currentUser, credits, setCredits, userProfile } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const lastClaimedStr = userProfile?.lastClaimedFreeCredits;

  useEffect(() => {
    if (!lastClaimedStr) {
      setTimeLeft(0);
      return undefined;
    }

    const calculateTimeLeft = () => {
      const lastClaimedTime = new Date(lastClaimedStr).getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = lastClaimedTime + oneWeekMs - now;
      return diff > 0 ? Math.floor(diff / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaimedStr]);

  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return "";
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const getAuthHeaders = async () => {
    if (!currentUser) return {};
    const token = await currentUser.getIdToken(true);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const handleClaimFreeCredits = async () => {
    if (!currentUser) return;
    setClaiming(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/credits/claim-free`, {
        method: "POST",
        headers: await getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to claim free credits.");
      }

      setCredits(data.credits);
      setStatus({
        type: "success",
        message: "Successfully claimed 3 free credits! Cooldown started.",
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to claim credits." });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="profile-page-container">
      <button type="button" className="profile-back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>

      <div className="profile-grid">
        <div className="profile-sidebar-card">
          <div className="credits-icon-large">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <h3>Credits Balance</h3>
          <div className="profile-stat-box" style={{ marginTop: "1rem" }}>
            <div className="profile-stat-val" style={{ fontSize: "2.5rem", color: "#eab308" }}>{credits}</div>
            <div className="profile-stat-label">Credits Remaining</div>
          </div>
        </div>

        <div className="profile-main-card">
          <div className="credits-header-row">
            <h2>Manage Credits</h2>
            <p className="credits-subtitle-note">Claim your free weekly credits below.</p>
          </div>

          <div className="credits-claim-section">
            <div className="credits-claim-card">
              <div className="credits-claim-info">
                <h3>Weekly Free Reward</h3>
                <p>Claim 3 free credits every week to generate comprehensive AI reports. Cooldown triggers for 7 days post claim.</p>
              </div>

              <div className="credits-claim-action-box">
                {timeLeft > 0 ? (
                  <div className="credits-cooldown-timer">
                    <span className="timer-lock-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <span className="timer-text">{formatCountdown(timeLeft)}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className={`credits-claim-btn ${timeLeft > 0 ? "locked" : ""}`}
                  disabled={timeLeft > 0 || claiming}
                  onClick={handleClaimFreeCredits}
                >
                  {claiming ? "Claiming..." : timeLeft > 0 ? "Claim Locked" : "Get my free credits"}
                </button>
              </div>
            </div>
          </div>

          {status.message && (
            <div className={`profile-status-msg ${status.type}`} style={{ marginTop: "2rem" }}>
              {status.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
