import React from "react";

export default function LinkedInAnalyzer({ onBack }) {
  return (
    <div className="linkedin-analyzer-page" style={{ padding: "2rem", minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Back Button */}
      <button 
        type="button" 
        className="profile-back-btn" 
        onClick={onBack}
        style={{
          position: "absolute",
          top: "2rem",
          left: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "white",
          padding: "0.6rem 1.2rem",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
      >
        ← Back
      </button>

      {/* Decorative background glow elements */}
      <div style={{
        position: "absolute",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0) 70%)",
        top: "20%",
        left: "30%",
        zIndex: 0,
        filter: "blur(40px)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        width: "250px",
        height: "250px",
        background: "radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0) 70%)",
        bottom: "20%",
        right: "30%",
        zIndex: 0,
        filter: "blur(30px)",
        pointerEvents: "none"
      }} />

      {/* Glassmorphic card */}
      <div style={{
        maxWidth: "600px",
        width: "100%",
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "3rem 2rem",
        textAlign: "center",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        zIndex: 1,
        animation: "fadeInUp 0.8s ease-out"
      }}>
        {/* Glowing LinkedIn icon representation */}
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 2rem auto",
          boxShadow: "0 0 20px rgba(167, 139, 250, 0.5)",
          animation: "pulse 2s infinite alternate"
        }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </div>

        <h2 style={{
          fontSize: "2rem",
          fontWeight: "800",
          background: "linear-gradient(to right, #ffffff, #94a3b8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem"
        }}>
          LinkedIn Analyzer
        </h2>
        
        {/* Holographic badge */}
        <div style={{
          display: "inline-block",
          padding: "0.4rem 1rem",
          borderRadius: "9999px",
          background: "rgba(167, 139, 250, 0.1)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          color: "#c084fc",
          fontWeight: "600",
          fontSize: "0.85rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "1.5rem"
        }}>
          ✨ Coming Soon
        </div>

        <p style={{
          color: "#94a3b8",
          fontSize: "1.05rem",
          lineHeight: "1.6",
          maxWidth: "450px",
          margin: "0 auto 2.5rem auto"
        }}>
          Our AI recruiter module is currently in training to analyze your LinkedIn headlines, experience depth, and networking presence to recommend direct optimizations.
        </p>

        {/* Elegant Progress bar representation */}
        <div style={{
          width: "80%",
          height: "6px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "9999px",
          margin: "0 auto",
          overflow: "hidden",
          position: "relative"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "70%",
            background: "linear-gradient(90deg, #a78bfa, #38bdf8)",
            borderRadius: "9999px",
            animation: "progressLoading 3s ease-in-out infinite alternate"
          }} />
        </div>
        <div style={{
          color: "#64748b",
          fontSize: "0.8rem",
          marginTop: "0.5rem",
          fontWeight: "500"
        }}>
          Training Progress: 70%
        </div>
      </div>

      {/* Styled JSX for custom keyframes */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(167, 139, 250, 0.4); }
          100% { transform: scale(1.08); box-shadow: 0 0 30px rgba(56, 189, 248, 0.7); }
        }
        @keyframes progressLoading {
          0% { width: 50%; }
          100% { width: 85%; }
        }
      `}</style>
    </div>
  );
}
