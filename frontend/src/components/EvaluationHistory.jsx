import React, { useState } from "react";
import { renderMarkdown } from "./ResumeAnalyzer";

function getReportScore(rep) {
  if (typeof rep.score === "number") return rep.score;
  if (!rep.report) return null;
  const m = rep.report.match(/(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)/i) || rep.report.match(/\b(\d+)\s*\/\s*100\b/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (val >= 0 && val <= 100) return val;
  }
  return null;
}

export default function EvaluationHistory({
  onBack,
  historyReports = [],
  recentSearches = [],
  isLoading = false,
  onOpenReport,
  onReuseSearch,
}) {
  const [selectedResumeReport, setSelectedResumeReport] = useState(null);
  const [activeTab, setActiveTab] = useState("report"); // "report", "resume", "jd"

  const leetcodeReports = historyReports.filter(
    (r) => r.type === "leetcode" || (r.username && r.type !== "resume")
  );
  const resumeReports = historyReports.filter(
    (r) => r.type === "resume" || (!r.username && (r.fileName || r.content))
  );

  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="evaluation-history-page" style={{ padding: "2rem 1rem", maxWidth: "1250px", margin: "0 auto", width: "100%" }}>
      {/* Page Header */}
      <div className="page-header-row" style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <button type="button" className="profile-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ marginLeft: "1rem", color: "white", fontWeight: "800" }}>Evaluation History</h2>
      </div>

      <p className="topics-note" style={{ marginBottom: "2rem", color: "#94a3b8", fontSize: "1rem" }}>
        Reopen your past profile checks and resume evaluations instantly without spending any credits.
      </p>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="loader" style={{ width: "45px", height: "45px", borderWidth: "4px", margin: "0 auto 1rem auto", borderColor: "var(--accent) transparent transparent transparent" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading your saved evaluation reports...</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "2rem",
          alignItems: "start"
        }}>
          
          {/* Column 1: LeetCode Analyzer */}
          <section className="card" style={{
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(167, 139, 250, 0.2)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "1.35rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span>🚀</span> LeetCode Analyzer
                </h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Saved coding profile checkups & AI coaching
                </p>
              </div>
              <span className="chip" style={{ background: "rgba(167, 139, 250, 0.15)", border: "1px solid var(--accent)", color: "#a78bfa", fontWeight: "700", margin: 0 }}>
                {leetcodeReports.length} Saved
              </span>
            </div>

            {leetcodeReports.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {leetcodeReports.map((rep) => (
                  <article key={rep.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "14px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.4)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"}
                  >
                    <div>
                      <strong style={{ display: "block", color: "white", fontSize: "1.1rem", marginBottom: "0.3rem" }}>
                        @{rep.username}
                      </strong>
                      <small style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        🕒 {rep.timestamp ? new Date(rep.timestamp).toLocaleDateString() + " at " + new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Date Unknown"}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReport?.(rep)}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                        transition: "transform 0.15s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      Open Report →
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(0,0,0,0.15)", borderRadius: "14px" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>No LeetCode evaluations saved yet.</p>
              </div>
            )}
          </section>

          {/* Column 2: Resume Analyzer */}
          <section className="card" style={{
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "20px",
            padding: "1.75rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "1.35rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span>📄</span> Resume Analyzer
                </h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Saved ATS match scores & full resume reports
                </p>
              </div>
              <span className="chip" style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", fontWeight: "700", margin: 0 }}>
                {resumeReports.length} Saved
              </span>
            </div>

            {resumeReports.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {resumeReports.map((rep) => {
                  const score = getReportScore(rep);
                  let scoreColor = "#ef4444"; // red
                  let scoreBg = "rgba(239, 68, 68, 0.15)";
                  let scoreBorder = "rgba(239, 68, 68, 0.4)";
                  if (score >= 80) {
                    scoreColor = "#22c55e"; // green
                    scoreBg = "rgba(34, 197, 94, 0.15)";
                    scoreBorder = "rgba(34, 197, 94, 0.4)";
                  } else if (score >= 50) {
                    scoreColor = "#eab308"; // yellow
                    scoreBg = "rgba(234, 179, 8, 0.15)";
                    scoreBorder = "rgba(234, 179, 8, 0.4)";
                  }

                  return (
                    <article key={rep.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      padding: "1.25rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "14px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <strong style={{ display: "block", color: "white", fontSize: "1.05rem", marginBottom: "0.25rem", wordBreak: "break-word" }}>
                            📋 {rep.fileName || "Resume Analysis"}
                          </strong>
                          <small style={{ color: "#64748b", fontSize: "0.78rem" }}>
                            🕒 {rep.timestamp ? new Date(rep.timestamp).toLocaleDateString() + " at " + new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Date Unknown"}
                          </small>
                        </div>

                        {score !== null && (
                          <div style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            background: scoreBg,
                            border: `1px solid ${scoreBorder}`,
                            color: scoreColor,
                            fontWeight: "800",
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                          }}>
                            Score: {score}/100
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.2rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedResumeReport(rep);
                            setActiveTab("report");
                          }}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            borderRadius: "8px",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            transition: "background 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(56, 189, 248, 0.15)"}
                        >
                          View Full Resume & Report →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(rep.report, "Recruiter Report")}
                          title="Copy Report to Clipboard"
                          style={{
                            padding: "8px 12px",
                            background: "rgba(255,255,255,0.05)",
                            color: "#cbd5e1",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            cursor: "pointer"
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(0,0,0,0.15)", borderRadius: "14px" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>No Resume evaluations saved yet.</p>
              </div>
            )}
          </section>

        </div>
      )}

      {/* Interactive Modal for Saved Resume Details */}
      {selectedResumeReport && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1.5rem"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "850px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            animation: "fadeInUp 0.25s ease"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.5rem",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}>
              <div>
                <h3 style={{ color: "white", margin: 0, fontSize: "1.25rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span>📄</span> {selectedResumeReport.fileName || "Resume Analysis"}
                </h3>
                <small style={{ color: "#64748b" }}>
                  Evaluated on {selectedResumeReport.timestamp ? new Date(selectedResumeReport.timestamp).toLocaleString() : "Unknown date"}
                </small>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedResumeReport(null)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.2)"
            }}>
              {[
                { key: "report", label: "📊 AI Assessment & Score" },
                { key: "resume", label: "📄 Full Resume Text" },
                { key: "jd", label: "💼 Target JD" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    background: activeTab === tab.key ? "rgba(56, 189, 248, 0.15)" : "transparent",
                    color: activeTab === tab.key ? "#38bdf8" : "#94a3b8",
                    border: "none",
                    borderBottom: activeTab === tab.key ? "2px solid #38bdf8" : "2px solid transparent",
                    fontWeight: activeTab === tab.key ? "700" : "500",
                    fontSize: "0.92rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: "1.75rem", overflowY: "auto", flex: 1, maxHeight: "55vh", background: "rgba(10, 15, 30, 0.6)" }}>
              {activeTab === "report" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span className="chip" style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid #22c55e", color: "#22c55e", fontWeight: "800", margin: 0 }}>
                      Score: {getReportScore(selectedResumeReport) ?? "N/A"} / 100
                    </span>
                    <button
                      type="button"
                      className="profile-history-btn"
                      onClick={() => handleCopyText(selectedResumeReport.report, "AI Report")}
                      style={{ margin: 0, padding: "6px 14px", fontSize: "0.8rem" }}
                    >
                      Copy Report Text
                    </button>
                  </div>
                  <div className="report-markdown-scroll" style={{ maxHeight: "none" }}>
                    {renderMarkdown(
                      (selectedResumeReport.report || "")
                        .replace(/^(?:#+\s*)?(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\n*/i, "")
                        .replace(/^\*\*(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\*\*\n*/i, "")
                    )}
                  </div>
                </div>
              )}

              {activeTab === "resume" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ color: "white", margin: 0, fontSize: "1rem" }}>Saved Full Resume / PDF Text</h4>
                    <button
                      type="button"
                      className="profile-history-btn"
                      onClick={() => handleCopyText(selectedResumeReport.content || selectedResumeReport.resumeContent, "Resume text")}
                      style={{ margin: 0, padding: "6px 14px", fontSize: "0.8rem" }}
                    >
                      Copy Resume Text
                    </button>
                  </div>
                  <pre style={{
                    background: "rgba(0,0,0,0.35)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#cbd5e1",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: "0.88rem",
                    lineHeight: "1.6",
                    margin: 0
                  }}>
                    {selectedResumeReport.content || selectedResumeReport.resumeContent || "No raw resume text recorded for this evaluation."}
                  </pre>
                </div>
              )}

              {activeTab === "jd" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ color: "white", margin: 0, fontSize: "1rem" }}>Target Job Description</h4>
                    <button
                      type="button"
                      className="profile-history-btn"
                      onClick={() => handleCopyText(selectedResumeReport.jdText, "Job description")}
                      style={{ margin: 0, padding: "6px 14px", fontSize: "0.8rem" }}
                    >
                      Copy JD
                    </button>
                  </div>
                  <pre style={{
                    background: "rgba(0,0,0,0.35)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#cbd5e1",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: "0.88rem",
                    lineHeight: "1.6",
                    margin: 0
                  }}>
                    {selectedResumeReport.jdText || "No Job Description recorded for this evaluation."}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1rem 1.5rem",
              background: "rgba(255,255,255,0.02)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                type="button"
                onClick={() => setSelectedResumeReport(null)}
                style={{
                  padding: "8px 20px",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
