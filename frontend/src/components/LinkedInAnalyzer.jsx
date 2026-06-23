import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LinkedInAnalyzer({ onBack, credits, onUpdateCredits }) {
  const { currentUser } = useAuth();
  const [profileText, setProfileText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState("");

  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "")
  ).replace(/\/$/, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = profileText.trim();
    if (!trimmed) {
      setError("Please paste your LinkedIn profile or resume text first.");
      return;
    }

    if (Number(credits) <= 0) {
      setError("You have no credits remaining. Please purchase more credits.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/linkedin/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileText: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze LinkedIn profile.");
      }

      setReport(data.report);
      if (typeof data.remainingCredits === "number") {
        onUpdateCredits?.(data.remainingCredits);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    alert("Report copied to clipboard!");
  };

  return (
    <div className="linkedin-analyzer-page">
      <div className="page-header-row" style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <button type="button" className="profile-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ marginLeft: "1rem", color: "white" }}>LinkedIn & Resume Analyzer</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: report ? "1fr 1.2fr" : "1fr", gap: "2rem" }}>
        {/* Left Column: Form Editor */}
        <section className="card analyze-card" style={{ height: "fit-content" }}>
          <p className="topics-note" style={{ marginBottom: "1.2rem" }}>
            Paste your LinkedIn profile text (from "Save to PDF" or bio) or raw resume text below. Our AI recruiter will analyze your headlines, experience depth, skill positioning, and suggest STAR-format enhancements.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <textarea
              className="linkedin-textarea"
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              placeholder="Paste your LinkedIn summary, work experience, or full resume text here..."
              rows={12}
              style={{
                width: "100%",
                borderRadius: "8px",
                padding: "1rem",
                background: "rgba(10, 15, 30, 0.6)",
                border: "1px solid var(--accent)",
                color: "white",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                resize: "vertical"
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <span className="chip" style={{ background: "rgba(167, 139, 250, 0.15)", border: "1px solid var(--accent)" }}>
                {credits} Credits Remaining
              </span>
              <button
                type="submit"
                className="coach-button"
                style={{ width: "auto", minWidth: "180px", margin: 0 }}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze Profile (-1 credit)"}
              </button>
            </div>
          </form>

          {error && (
            <p className="error" style={{ marginTop: "1rem" }}>
              {error}
            </p>
          )}
        </section>

        {/* Right Column: Report Display */}
        {report && (
          <section className="card report-card reveal-on-scroll" style={{ animation: "fadeInUp 0.5s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
              <h3 style={{ color: "var(--accent)" }}>Profile Assessment Report</h3>
              <button type="button" className="profile-history-btn" onClick={handleCopy} style={{ margin: 0, padding: "6px 12px", fontSize: "0.85rem" }}>
                Copy Report
              </button>
            </div>

            <div className="report-markdown-scroll" style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: "10px" }}>
              {report.split("\n\n").map((paragraph, index) => {
                if (paragraph.startsWith("#")) {
                  const level = paragraph.match(/^#+/)[0].length;
                  const text = paragraph.replace(/^#+\s*/, "");
                  if (level === 1) return <h1 key={index} style={{ color: "white", margin: "1rem 0 0.5rem 0", fontSize: "1.6rem" }}>{text}</h1>;
                  if (level === 2) return <h2 key={index} style={{ color: "var(--accent)", margin: "0.9rem 0 0.4rem 0", fontSize: "1.3rem" }}>{text}</h2>;
                  return <h3 key={index} style={{ color: "white", margin: "0.8rem 0 0.3rem 0", fontSize: "1.1rem" }}>{text}</h3>;
                }
                if (paragraph.startsWith("-") || paragraph.startsWith("*")) {
                  return (
                    <ul key={index} style={{ margin: "0.5rem 0", paddingLeft: "1.2rem", color: "var(--text-secondary)" }}>
                      {paragraph.split("\n").map((li, idx) => (
                        <li key={idx} style={{ marginBottom: "4px", fontSize: "0.95rem" }}>{li.replace(/^[-*]\s*/, "")}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={index} style={{ color: "var(--text-secondary)", lineHeight: "1.6", margin: "0.6rem 0", fontSize: "0.95rem" }}>
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
