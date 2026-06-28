import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

// Experience level checker
export function evaluateExperience(text) {
  const lowerText = text.toLowerCase();
  
  // 1. Direct regex for numeric values before "years/yrs"
  const expRegex = /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b/gi;
  let match;
  while ((match = expRegex.exec(lowerText)) !== null) {
    const years = parseFloat(match[1]);
    if (years > 1) {
      return {
        violated: true,
        reason: `Detected direct mention of "${match[0]}" of experience.`
      };
    }
  }
  
  // 2. Direct regex for word numbers before "years/yrs"
  const textNumbers = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  for (let i = 0; i < textNumbers.length; i++) {
    const word = textNumbers[i];
    const wordRegex = new RegExp(`\\b${word}\\+?\\s*(?:years?|yrs?)\\b`, "i");
    const m = wordRegex.exec(lowerText);
    if (m) {
      return {
        violated: true,
        reason: `Detected "${m[0]}" of experience.`
      };
    }
  }

  // 3. Date ranges of work experience (e.g. 2021-2025)
  const dateRangeRegex = /\b(20\d{2})\s*[-–—to]+\s*(20\d{2}|present)\b/gi;
  let dateMatch;
  const currentYear = 2026;
  while ((dateMatch = dateRangeRegex.exec(lowerText)) !== null) {
    const startYear = parseInt(dateMatch[1], 10);
    const endYear = dateMatch[2].toLowerCase() === "present" ? currentYear : parseInt(dateMatch[2], 10);
    const diff = endYear - startYear;
    
    if (diff > 1) {
      // Inspect surrounding context to differentiate work from education/university
      const startIdx = Math.max(0, dateMatch.index - 100);
      const endIdx = Math.min(lowerText.length, dateMatch.index + dateMatch[0].length + 100);
      const context = lowerText.substring(startIdx, endIdx);
      
      const isEducation = /\b(education|university|college|school|degree|b\.?tech|m\.?tech|bachelor|master|phd|gpa|courses?|academic)\b/i.test(context);
      
      if (!isEducation) {
        const isWork = /\b(work|experience|job|intern|engineer|developer|analyst|programmer|coder|employment|position|role|officer|manager|lead|architect|consultant)\b/i.test(context);
        if (isWork) {
          return {
            violated: true,
            reason: `Detected employment period ${dateMatch[0]} (${diff} years).`
          };
        }
      }
    }
  }
  
  return { violated: false };
}

// Helper to extract ATS score from Markdown
function extractScore(reportText) {
  if (!reportText) return null;
  const patterns = [
    /(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)\s*%/i,
    /(\d+)\s*%\s*(?:Match|ATS|Overall)?\s*Score/i,
    /(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)\s*\/100/i,
    /\b(\d+)\s*%\b/
  ];
  for (const pattern of patterns) {
    const match = reportText.match(pattern);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 0 && val <= 100) return val;
    }
  }
  return null;
}

// Helper to parse simple bold markdown **text**
function parseInlineMarkdown(text) {
  const parts = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} style={{ color: "white" }}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// A line-by-line Markdown renderer to fix rendering issues
export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ margin: "0.5rem 0 1rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
            {currentList.map((li, idx) => (
              <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem", lineHeight: "1.5" }}>{li}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      continue;
    }

    // Check for headings
    if (line.startsWith("#")) {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ margin: "0.5rem 0 1rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
            {currentList.map((li, idx) => (
              <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem", lineHeight: "1.5" }}>{li}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      const level = line.match(/^#+/)[0].length;
      const cleanText = line.replace(/^#+\s*/, "").replace(/\*\*|__/g, ""); // strip bold markers from header
      if (level === 1) {
        elements.push(<h1 key={i} style={{ color: "white", margin: "1.5rem 0 0.75rem 0", fontSize: "1.6rem", fontWeight: "700" }}>{cleanText}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={i} style={{ color: "var(--accent)", margin: "1.25rem 0 0.6rem 0", fontSize: "1.3rem", fontWeight: "600" }}>{cleanText}</h2>);
      } else {
        elements.push(<h3 key={i} style={{ color: "white", margin: "1rem 0 0.5rem 0", fontSize: "1.1rem", fontWeight: "600" }}>{cleanText}</h3>);
      }
    } 
    // Check for bullet list items
    else if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•")) {
      const cleanText = line.replace(/^[-*•]\s*/, "");
      const formattedText = parseInlineMarkdown(cleanText);
      currentList.push(formattedText);
    } 
    // Check for numbered list items
    else if (/^\d+\.\s+/.test(line)) {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ margin: "0.5rem 0 1rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
            {currentList.map((li, idx) => (
              <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem", lineHeight: "1.5" }}>{li}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      const cleanText = line.replace(/^\d+\.\s*/, "");
      const formattedText = parseInlineMarkdown(cleanText);
      elements.push(
        <div key={i} style={{ display: "flex", gap: "0.5rem", margin: "0.5rem 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--accent)", fontWeight: "700" }}>{line.match(/^\d+\./)[0]}</span>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", margin: 0, fontSize: "0.95rem" }}>
            {formattedText}
          </p>
        </div>
      );
    } 
    // Regular paragraphs
    else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ margin: "0.5rem 0 1rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
            {currentList.map((li, idx) => (
              <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem", lineHeight: "1.5" }}>{li}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      const formattedText = parseInlineMarkdown(line);
      elements.push(
        <p key={i} style={{ color: "var(--text-secondary)", lineHeight: "1.6", margin: "0.75rem 0", fontSize: "0.95rem" }}>
          {formattedText}
        </p>
      );
    }
  }

  // Flush remaining list
  if (currentList.length > 0) {
    elements.push(
      <ul key={`list-end`} style={{ margin: "0.5rem 0 1rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
        {currentList.map((li, idx) => (
          <li key={idx} style={{ marginBottom: "6px", fontSize: "0.95rem", lineHeight: "1.5" }}>{li}</li>
        ))}
      </ul>
    );
  }

  return elements;
}

// Dynamically load PDF.js client-side

const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function ResumeAnalyzer({ onBack, credits, onUpdateCredits }) {
  const { currentUser } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");
  const [violationError, setViolationError] = useState("");
  const [report, setReport] = useState("");
  const [jdText, setJdText] = useState("");

  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "")
  ).replace(/\/$/, "");

  // Handle PDF Parsing
  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setParsingPdf(true);
    setError("");
    setViolationError("");
    setReport("");
    setFileName(file.name);

    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
      }

      const extracted = fullText.trim();
      if (!extracted) {
        throw new Error("No readable text found in PDF. Make sure it is not scanned/an image.");
      }

      setResumeText(extracted);
      
      // Immediately evaluate extracted text for experience violation
      const evalResult = evaluateExperience(extracted);
      if (evalResult.violated) {
        setViolationError(evalResult.reason);
      }
    } catch (err) {
      setError("Failed to parse PDF: " + (err.message || err));
      setFileName("");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handlePdfUpload(e.dataTransfer.files[0]);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setResumeText(text);
    setError("");
    setViolationError("");
    
    // Evaluate in real-time
    if (text.trim()) {
      const evalResult = evaluateExperience(text);
      if (evalResult.violated) {
        setViolationError(evalResult.reason);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedResume = resumeText.trim();
    const trimmedJd = jdText.trim();
    if (!trimmedResume) {
      setError("Please paste resume text or upload a PDF first.");
      return;
    }
    if (!trimmedJd) {
      setError("Please paste a Job Description (JD) to match against.");
      return;
    }

    // Double check violation
    const evalResult = evaluateExperience(trimmedResume);
    if (evalResult.violated) {
      setViolationError(evalResult.reason);
      // Warning only, do not block matching
    }

    if (currentUser && Number(credits) <= 0) {
      setError("You have no credits remaining. Please purchase more credits.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const visitId = sessionStorage.getItem("leetlens_unregistered_visit_id") || "";

      const response = await fetch(`${API_BASE_URL}/api/resume/match`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          resumeText: trimmedResume,
          jdText: trimmedJd,
          fileName: fileName || "Pasted Text",
          visitId: visitId
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to match resume with Job Description.");
      }

      setReport(data.report);
      if (currentUser && typeof data.remainingCredits === "number") {
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

  if (loading) {
    return (
      <div className="resume-analyzer-page" style={{ padding: "2rem", minHeight: "75vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Back Button */}
        <button type="button" className="profile-back-btn" onClick={onBack} style={{ position: "absolute", top: "2rem", left: "2rem" }}>
          ← Back
        </button>

        <div className="card analyze-card" style={{ maxWidth: "500px", width: "100%", textAlign: "center", padding: "3rem 2rem", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px" }}>
          <div className="loader" style={{ width: "50px", height: "50px", borderWidth: "4px", margin: "0 auto 1.5rem auto", borderColor: "var(--accent) transparent transparent transparent" }} />
          <h3 style={{ color: "white", fontSize: "1.3rem", fontWeight: "700", marginBottom: "2rem" }}>Analyzing...</h3>
          
          {/* Animated loading bar */}
          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "100%", background: "linear-gradient(90deg, #a78bfa, #38bdf8)", borderRadius: "10px", animation: "loadingBarAnim 2.5s infinite ease-in-out" }} />
          </div>
        </div>
        <style>{`
          @keyframes loadingBarAnim {
            0% { left: -100%; width: 100%; }
            50% { left: 0%; width: 100%; }
            100% { left: 100%; width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="resume-analyzer-page" style={{ padding: "2rem 1rem", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
      {/* Page Header */}
      <div className="page-header-row" style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <button type="button" className="profile-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ marginLeft: "1rem", color: "white" }}>Resume & JD Matcher</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Split Input Layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          width: "100%"
        }}>
          
          {/* Left Column: Resume Input */}
          <section className="card analyze-card" style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "1.5rem"
          }}>
            <div>
              <h3 style={{ color: "white", marginBottom: "0.25rem", fontSize: "1.2rem", fontWeight: "700" }}>📄 Resume Upload or Text</h3>
              <p className="topics-note" style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                Upload your PDF resume or paste the raw text.
              </p>
            </div>

            {/* PDF Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragActive ? "#38bdf8" : "rgba(255,255,255,0.15)"}`,
                borderRadius: "10px",
                padding: "1.2rem",
                textAlign: "center",
                background: isDragActive ? "rgba(56, 189, 248, 0.05)" : "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative"
              }}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handlePdfUpload(e.target.files[0])}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer"
                }}
              />
              
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={fileName ? "#a78bfa" : "#64748b"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: "0.5rem" }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>

              {fileName ? (
                <div>
                  <p style={{ color: "#a78bfa", fontWeight: "600", margin: "0 0 0.1rem 0", fontSize: "0.9rem" }}>{fileName}</p>
                  <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>Click or drag to replace PDF</p>
                </div>
              ) : (
                <div>
                  <p style={{ color: "white", fontWeight: "500", margin: "0 0 0.1rem 0", fontSize: "0.9rem" }}>Drag & drop resume PDF here</p>
                  <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>or click to browse files</p>
                </div>
              )}
              
              <div style={{ marginTop: "0.5rem" }}>
                <span className="chip" style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                  Powered by PDF.js
                </span>
              </div>
            </div>

            {parsingPdf && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#38bdf8" }}>
                <div className="loader" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                <span style={{ fontSize: "0.8rem" }}>Extracting text from PDF...</span>
              </div>
            )}

            {/* Separator */}
            <div style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "0.7rem", color: "#475569" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ padding: "0 0.75rem", letterSpacing: "0.1em" }}>Or Paste Text</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Plain Text Area */}
            <textarea
              className="linkedin-textarea"
              value={resumeText}
              onChange={handleTextChange}
              placeholder="Paste your full resume text here..."
              rows={11}
              style={{
                width: "100%",
                borderRadius: "8px",
                padding: "0.75rem",
                background: "rgba(10, 15, 30, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                fontFamily: "inherit",
                fontSize: "0.9rem",
                lineHeight: "1.4",
                resize: "vertical"
              }}
            />
          </section>

          {/* Right Column: Job Description Input */}
          <section className="card analyze-card" style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "1.5rem"
          }}>
            <div>
              <h3 style={{ color: "white", marginBottom: "0.25rem", fontSize: "1.2rem", fontWeight: "700" }}>💼 Job Description (JD)</h3>
              <p className="topics-note" style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                Paste the job description or role requirements here.
              </p>
            </div>

            {/* JD Text Area */}
            <textarea
              className="linkedin-textarea"
              value={jdText}
              onChange={(e) => {
                setJdText(e.target.value);
                setError("");
              }}
              placeholder="Paste the target job description (skills, requirements, responsibilities) here..."
              rows={18}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "260px",
                borderRadius: "8px",
                padding: "0.75rem",
                background: "rgba(10, 15, 30, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                fontFamily: "inherit",
                fontSize: "0.9rem",
                lineHeight: "1.4",
                resize: "vertical"
              }}
            />
          </section>

        </div>

        {/* Action Panel */}
        <section className="card analyze-card" style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1rem 1.5rem",
          width: "100%"
        }}>
          <span className="chip" style={{ background: "rgba(167, 139, 250, 0.15)", border: "1px solid var(--accent)", color: "white", margin: 0 }}>
            {currentUser ? `${credits} Credits Remaining` : "Anonymous Session (Free)"}
          </span>
          
          <button
            type="submit"
            className="coach-button"
            onClick={handleSubmit}
            style={{ width: "auto", minWidth: "220px", margin: 0 }}
            disabled={loading || parsingPdf}
          >
            {currentUser ? "Match & Analyze (-1 credit)" : "Match & Analyze (Free)"}
          </button>

          {/* Experience level policy violation inside action card */}
          {violationError && (
            <div style={{
              width: "100%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "1rem",
              marginTop: "0.5rem"
            }}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <h4 style={{ color: "#ef4444", margin: "0 0 0.25rem 0", fontWeight: "700" }}>Experience Level &gt; 1 Year</h4>
                  <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: "0 0 0.5rem 0", lineHeight: "1.4" }}>
                    We detected details suggesting more than 1 year of experience ({violationError}). 
                  </p>
                  <div style={{ display: "inline-block", padding: "0.2rem 0.6rem", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: "0.75rem", borderRadius: "4px" }}>
                    ℹ️ Warning only: Match & Analyze is still enabled.
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="error" style={{ width: "100%", margin: "0.5rem 0 0 0", color: "#ef4444", fontWeight: "600" }}>
              {error}
            </p>
          )}
        </section>

        {/* Report Display Block */}
        {report && (() => {
          const score = extractScore(report);
          const cleanReport = report.replace(/^ATS Score:\s*\d+%\s*\n*/i, "");

          let scoreColor = "#ef4444"; // red
          let scoreBg = "rgba(239, 68, 68, 0.1)";
          let scoreBorder = "rgba(239, 68, 68, 0.2)";
          if (score >= 80) {
            scoreColor = "#22c55e"; // green
            scoreBg = "rgba(34, 197, 94, 0.1)";
            scoreBorder = "rgba(34, 197, 94, 0.2)";
          } else if (score >= 50) {
            scoreColor = "#eab308"; // yellow
            scoreBg = "rgba(234, 179, 8, 0.1)";
            scoreBorder = "rgba(234, 179, 8, 0.2)";
          }

          return (
            <section className="card report-card reveal-on-scroll" style={{ animation: "fadeInUp 0.5s ease", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
                <h3 style={{ color: "var(--accent)", margin: 0 }}>Recruiter Assessment Report</h3>
                <button type="button" className="profile-history-btn" onClick={handleCopy} style={{ margin: 0, padding: "8px 16px", fontSize: "0.85rem" }}>
                  Copy Report
                </button>
              </div>

              {score !== null && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  background: scoreBg,
                  border: `1px solid ${scoreBorder}`,
                  padding: "1.2rem",
                  borderRadius: "12px",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap"
                }}>
                  {/* Circular Gauge */}
                  <div style={{ position: "relative", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", borderRadius: "50%", padding: "4px" }}>
                    <svg width="70" height="70" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="3.5"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 1s ease-in-out" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", color: "white", fontWeight: "800", fontSize: "1.1rem" }}>
                      {score}%
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: scoreColor, fontWeight: "800", background: "rgba(255,255,255,0.05)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                        ATS Compatibility
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "white" }}>
                        Score: {score}/100
                      </span>
                    </div>
                    <p style={{ color: "#cbd5e1", margin: "0.3rem 0 0 0", fontSize: "0.85rem", lineHeight: "1.4" }}>
                      {score >= 80 
                        ? "Excellent match! Your resume contains a strong alignment with the job requirements and keywords."
                        : score >= 50
                        ? "Good foundation, but there are key gaps in skills or keywords. See recommendations below to tailor your resume."
                        : "Low compatibility. Tailor your resume substantially by incorporating the missing skills and keywords listed below."
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="report-markdown-scroll" style={{ maxHeight: "none", paddingRight: "10px" }}>
                {renderMarkdown(cleanReport)}
              </div>
            </section>
          );
        })()}
      </div>
    </div>
  );
}
