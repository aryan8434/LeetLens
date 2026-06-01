import { useEffect, useState, useRef } from "react";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";
import AuthModal from "./components/AuthModal";
import AccountMenu from "./components/AccountMenu";
import ProfilePage from "./components/ProfilePage";
import EvaluationHistory from "./components/EvaluationHistory";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

const REPORT_CACHE_KEY = "leetlensCoachReports_v2";
const RECENT_SEARCHES_KEY = "leetlensRecentSearches_v1";

function getApiErrorMessage(data, fallback) {
  const base = data?.error || fallback;
  if (data?.details && data.details !== base) {
    return `${base} (${data.details})`;
  }

  return base;
}

function loadReportCache() {
  try {
    const raw = localStorage.getItem(REPORT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReportCache(cache) {
  try {
    localStorage.setItem(REPORT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

function getRecentSearchesKey(user) {
  return user?.uid ? `${RECENT_SEARCHES_KEY}_${user.uid}` : RECENT_SEARCHES_KEY;
}

function loadRecentSearches(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(storageKey, searches) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(searches));
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

function normalizeSearchValue(value) {
  return value.trim().toLowerCase();
}

function buildRecentSearchEntry(username) {
  return {
    username,
    normalized: normalizeSearchValue(username),
    searchedAt: new Date().toISOString(),
  };
}

function updateRecentSearches(searches, username) {
  const normalized = normalizeSearchValue(username);
  const next = [
    buildRecentSearchEntry(username),
    ...searches.filter((item) => item?.normalized !== normalized),
  ];

  return next.slice(0, 3);
}

async function fetchRecentSearchesFromServer(user) {
  if (!user) {
    return [];
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/search-history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data)
    ? data
        .map((item) => ({
          username: item.username,
          normalized: normalizeSearchValue(item.username || ""),
          searchedAt: item.timestamp || new Date().toISOString(),
        }))
        .filter((item) => item.username)
    : [];
}

function parseReportSections(reportText) {
  if (!reportText) {
    return [];
  }

  const lines = reportText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections = [];
  let current = null;

  lines.forEach((line) => {
    // 1. Clean leading list symbols, markdown hashes, space, and asterisks/underscores
    let clean = line.trim();
    while (true) {
      const next = clean.replace(/^[-*+•#\s]+/, "").trim();
      if (next === clean) break;
      clean = next;
    }
    clean = clean
      .replace(/^[*_]+/, "")
      .replace(/[*_]+$/, "")
      .trim();

    // 2. Check if clean matches "Section X: Title" or similar patterns
    // Matches "Section X: Name" or "Section X - Name" or "Section X. Name" or "Section X"
    const headingMatch = clean.match(
      /^(?:Section\s+\d+\s*[:-]\s*|\d+[\.\)]\s+)?(.+)$/i,
    );

    // We want to make sure it's actually a section heading.
    // If it explicitly says "Section \d+", or starts with a markdown header in the original line,
    // or if the title contains known section keywords:
    const keywords = [
      "insight",
      "score",
      "readiness",
      "breakdown",
      "weakness",
      "plan",
      "verdict",
      "eta",
      "faang",
    ];
    const isExplicitSection = /Section\s+\d+/i.test(clean);
    const startsWithHash = /^#+\s+/.test(line.trim());
    const isKeywordHeader =
      keywords.some((keyword) => clean.toLowerCase().includes(keyword)) &&
      clean.length < 50;

    // Check if it's a data line (e.g. "FAANG: 70/100" or "Overall Score: 82/100")
    const tempClean = clean
      .replace(/^(?:Section\s+\d+\s*[:-]\s*|\d+[\.\)]\s+)/i, "")
      .trim();
    const isDataLine = /:\s*\d+/.test(tempClean);

    const isHeading =
      (isExplicitSection || startsWithHash || isKeywordHeader) && !isDataLine;

    if (isHeading && headingMatch) {
      let title = headingMatch[1]
        .replace(/^[*_]+/, "")
        .replace(/[*_]+$/, "")
        .trim();

      // If title is just a number or empty, fallback to the clean line
      if (!title || /^\d+$/.test(title)) {
        title = clean;
      }

      current = {
        title: title,
        items: [],
      };
      sections.push(current);
      return;
    }

    if (!current) {
      current = {
        title: "Evaluation Report",
        items: [],
      };
      sections.push(current);
    }

    current.items.push(line.replace(/^[-*•]\s*/, ""));
  });

  return sections;
}

function normalizeSectionTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findSection(sections, includesText) {
  return sections.find((section) =>
    normalizeSectionTitle(section.title).includes(includesText),
  );
}

function extractScore(scoreSection) {
  if (!scoreSection) {
    return null;
  }

  const allText = scoreSection.items.join(" ");
  const match = allText.match(/\b(\d{1,3})\b/);
  if (!match) {
    return null;
  }

  const score = Number(match[1]);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    return null;
  }

  return score;
}

function getSectionTone(title) {
  const normalized = normalizeSectionTitle(title);
  if (normalized.includes("current insights")) {
    return "insights";
  }
  if (normalized.includes("company readiness")) {
    return "readiness";
  }
  if (normalized.includes("weakness")) {
    return "weakness";
  }
  if (normalized.includes("improvement plan")) {
    return "plan";
  }
  if (normalized.includes("verdict")) {
    return "verdict";
  }
  return "default";
}

function CreditsPage({ onBack }) {
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
      setStatus({
        type: "error",
        message: err.message || "Failed to claim credits.",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="profile-page-container">
      <button type="button" className="profile-back-btn" onClick={onBack}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>

      <div className="profile-grid">
        <div className="profile-sidebar-card">
          <div className="credits-icon-large">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <h3>Credits Balance</h3>
          <div className="profile-stat-box" style={{ marginTop: "1rem" }}>
            <div
              className="profile-stat-val"
              style={{ fontSize: "2.5rem", color: "#eab308" }}
            >
              {credits}
            </div>
            <div className="profile-stat-label">Credits Remaining</div>
          </div>
        </div>

        <div className="profile-main-card">
          <div className="credits-header-row">
            <h2>Manage Credits</h2>
            <p className="credits-subtitle-note">
              Claim your free weekly credits below.
            </p>
          </div>

          <div className="credits-claim-section">
            <div className="credits-claim-card">
              <div className="credits-claim-info">
                <h3>Weekly Free Reward</h3>
                <p>
                  Claim 3 free credits every week to generate comprehensive AI
                  reports. Cooldown triggers for 7 days post claim.
                </p>
              </div>

              <div className="credits-claim-action-box">
                {timeLeft > 0 ? (
                  <div className="credits-cooldown-timer">
                    <span className="timer-lock-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <span className="timer-text">
                      {formatCountdown(timeLeft)}
                    </span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className={`credits-claim-btn ${timeLeft > 0 ? "locked" : ""}`}
                  disabled={timeLeft > 0 || claiming}
                  onClick={handleClaimFreeCredits}
                >
                  {claiming
                    ? "Claiming..."
                    : timeLeft > 0
                      ? "Claim Locked"
                      : "Get my free credits"}
                </button>
              </div>
            </div>

            <div className="credits-claim-card" style={{ border: "1px dashed #475569", background: "rgba(15, 23, 42, 0.4)", marginTop: "1.2rem" }}>
              <div className="credits-claim-info">
                <h3>Need more credits?</h3>
                <p style={{ margin: "0.25rem 0 0", color: "#cbd5e1" }}>
                  Email <a href="mailto:bovcare@gmail.com" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "underline" }}>bovcare@gmail.com</a> to contact customer support and purchase credits.
                </p>
              </div>
            </div>
          </div>

          {status.message && (
            <div
              className={`profile-status-msg ${status.type}`}
              style={{ marginTop: "2rem" }}
            >
              {status.type === "success" ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
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

function renderLineWithHighlights(line) {
  if (typeof line !== "string") return line;

  const parts = line.split(/\*\*([^*]+)\*\*/g);

  return parts.map((part, index) => {
    const isBold = index % 2 === 1;

    const tokens = part.split(
      /(Hard|hard|Medium|medium|Easy|easy|FAANG|Product-based|Service-based|strong|Strong|weak|Weak|\d+(?:\.\d+)?%)/,
    );

    const renderedTokens = tokens.map((token, tIdx) => {
      if (/^FAANG$/.test(token)) {
        return (
          <span
            key={`faang-${tIdx}`}
            className="token-faang-custom"
            aria-label="FAANG"
          >
            <span className="faang-f">F</span>
            <span className="faang-a1">A</span>
            <span className="faang-a2">A</span>
            <span className="faang-n">N</span>
            <span className="faang-g">G</span>
          </span>
        );
      }

      let className = "token-default";
      if (/^Hard$|^hard$/.test(token)) {
        className = "token-hard";
      } else if (/^Medium$|^medium$/.test(token)) {
        className = "token-medium";
      } else if (/^Easy$|^easy$/.test(token)) {
        className = "token-easy";
      } else if (/^Product-based$/.test(token)) {
        className = "token-product";
      } else if (/^Service-based$/.test(token)) {
        className = "token-service";
      } else if (/^strong$|^Strong$/.test(token)) {
        className = "token-strong";
      } else if (/^weak$|^Weak$/.test(token)) {
        className = "token-weak";
      } else if (/^\d+(?:\.\d+)?%$/.test(token)) {
        className = "token-percent";
      }

      return (
        <span key={`token-${tIdx}`} className={className}>
          {token}
        </span>
      );
    });

    if (isBold) {
      return (
        <strong key={`bold-${index}`} className="bold-highlight">
          {renderedTokens}
        </strong>
      );
    }

    return <span key={`normal-${index}`}>{renderedTokens}</span>;
  });
}

function renderMarkdownLines(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={index} style={{ height: "0.5rem" }} />;
    }

    // Headers
    if (trimmed.startsWith("###")) {
      return (
        <h4 key={index} className="md-h4">
          {renderLineWithHighlights(trimmed.replace(/^###\s*/, ""))}
        </h4>
      );
    }
    if (trimmed.startsWith("##")) {
      return (
        <h3 key={index} className="md-h3">
          {renderLineWithHighlights(trimmed.replace(/^##\s*/, ""))}
        </h3>
      );
    }
    if (trimmed.startsWith("#")) {
      return (
        <h2 key={index} className="md-h2">
          {renderLineWithHighlights(trimmed.replace(/^#\s*/, ""))}
        </h2>
      );
    }

    // Unordered list items
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      return (
        <div key={index} className="md-bullet-item">
          <span className="bullet-dot">•</span>
          <span className="bullet-text">
            {renderLineWithHighlights(trimmed.replace(/^[-*]\s*/, ""))}
          </span>
        </div>
      );
    }

    // Numbered list items
    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      return (
        <div key={index} className="md-num-item">
          <span className="num-prefix">{numListMatch[1]}.</span>
          <span className="num-text">
            {renderLineWithHighlights(numListMatch[2])}
          </span>
        </div>
      );
    }

    return (
      <p key={index} className="md-para">
        {renderLineWithHighlights(line)}
      </p>
    );
  });
}

function pairReadinessItems(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i] || "";
    const next = items[i + 1] || "";
    if (next.toLowerCase().startsWith("reason:")) {
      pairs.push({
        heading: current,
        details: next,
      });
      i += 1;
    } else {
      pairs.push({
        heading: current,
        details: "",
      });
    }
  }
  return pairs;
}

function parseReadinessHeading(headingLine) {
  const match = headingLine.match(/^\s*([^:]+):\s*(\d{1,3})\s*\/\s*100\s*$/i);
  if (!match) {
    return {
      label: headingLine.replace(/:\s*$/, ""),
      score: null,
    };
  }

  return {
    label: match[1],
    score: Number(match[2]),
  };
}

function stripTrailingColon(text) {
  return (text || "").replace(/:\s*$/, "");
}

function getAverageReadiness(items) {
  const scores = items
    .map((row) => parseReadinessHeading(row.heading).score)
    .filter((score) => typeof score === "number" && !Number.isNaN(score));

  if (!scores.length) {
    return null;
  }

  return Math.round(
    scores.reduce((sum, value) => sum + value, 0) / scores.length,
  );
}

function pairHeadingDetailItems(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i] || "";
    const next = items[i + 1] || "";
    if (current.endsWith(":") && next) {
      pairs.push({
        heading: current,
        details: next,
      });
      i += 1;
    } else {
      pairs.push({
        heading: current,
        details: "",
      });
    }
  }
  return pairs;
}

const getUserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ location: "Location Not Supported", coordinates: "" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`,
            {
              headers: {
                "User-Agent": "LeetLens/1.0",
              },
            }
          );
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.suburb || "";
          const country = address.country || "";
          if (city && country) {
            resolve({ location: `${city}, ${country}`, coordinates: coordsStr });
          } else if (country) {
            resolve({ location: country, coordinates: coordsStr });
          } else {
            resolve({
              location: data.display_name || `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
              coordinates: coordsStr,
            });
          }
        } catch {
          resolve({
            location: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            coordinates: coordsStr,
          });
        }
      },
      (error) => {
        console.warn("Geolocation error:", error);
        resolve({ location: "location deny", coordinates: "location deny" });
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 0
      }
    );
  });
};

const captureUserPhoto = () => {
  return new Promise((resolve) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      resolve("Camera Not Supported");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 } })
      .then((stream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.play();

        setTimeout(() => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, 320, 240);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            stream.getTracks().forEach((track) => track.stop());
            resolve(dataUrl);
          } catch (e) {
            console.error("Failed to capture image from canvas:", e);
            stream.getTracks().forEach((track) => track.stop());
            resolve("camera error");
          }
        }, 800);
      })
      .catch((error) => {
        console.warn("Camera permission denied or failed:", error);
        resolve("camera deny");
      });
  });
};

const TOPIC_COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#f97316",
];

function getTopicColor(index) {
  return TOPIC_COLORS[index % TOPIC_COLORS.length];
}

function getMonthTicks(heatmap) {
  const ticks = [];
  let lastMonth = "";

  heatmap.forEach((item, index) => {
    const date = new Date(`${item.date}T00:00:00`);
    const month = date.toLocaleString("en-US", { month: "short" });
    if (month !== lastMonth) {
      ticks.push({ month, index });
      lastMonth = month;
    }
  });

  return ticks;
}

function getHeatLevel(count, maxCount) {
  if (count <= 0) {
    return 0;
  }

  const ratio = count / Math.max(1, maxCount);
  if (ratio >= 0.75) {
    return 4;
  }
  if (ratio >= 0.5) {
    return 3;
  }
  if (ratio >= 0.25) {
    return 2;
  }
  return 1;
}

function StandaloneDetailPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const reportId = params.get("id");
  const type = params.get("type");
  const month = params.get("month");

  useEffect(() => {
    async function loadAndMaybeUnlock() {
      if (!currentUser || !reportId) return;
      try {
        setLoading(true);
        const token = await currentUser.getIdToken();

        // 1. Fetch current report details
        const response = await fetch(
          `${API_BASE_URL}/api/reports/${reportId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load report detail.");
        }

        // 2. Check if the section needs unlocking
        let needsUnlock = false;
        let unlockUrl = "";
        let unlockBody = null;

        if (type === "topics" && !data.details?.topicBreakdown) {
          needsUnlock = true;
          unlockUrl = `${API_BASE_URL}/api/reports/${reportId}/unlock-topics`;
        } else if (type === "weaknesses" && !data.details?.weaknessAnalysis) {
          needsUnlock = true;
          unlockUrl = `${API_BASE_URL}/api/reports/${reportId}/unlock-weaknesses`;
        } else if (type === "roadmap") {
          const monthKey = `month${month}`;
          if (!data.details?.sixMonthPlan?.[monthKey]) {
            needsUnlock = true;
            unlockUrl = `${API_BASE_URL}/api/reports/${reportId}/unlock-month`;
            unlockBody = JSON.stringify({ month: Number(month) });
          }
        }

        if (needsUnlock) {
          setUnlocking(true);
          const unlockResp = await fetch(unlockUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: unlockBody,
          });
          const unlockData = await unlockResp.json();
          if (!unlockResp.ok) {
            throw new Error(
              unlockData.error ||
                "Failed to unlock detailed analysis (likely insufficient credits).",
            );
          }
          data.details = unlockData.details;
          localStorage.setItem(
            "leetlens_report_unlocked",
            JSON.stringify({
              reportId: reportId,
              timestamp: Date.now(),
            }),
          );
        }

        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setUnlocking(false);
      }
    }

    if (currentUser && reportId) {
      loadAndMaybeUnlock();
    } else if (reportId) {
      const timer = setTimeout(() => {
        if (!currentUser) {
          setError("Please log in to view this detailed report.");
          setLoading(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setError("No report ID provided.");
      setLoading(false);
    }
  }, [currentUser, reportId, type, month]);

  if (loading) {
    return (
      <div className="standalone-page loading-state">
        <div className="report-loader-wrap">
          <div className="loader" />
          <h3>
            {unlocking
              ? "Generating Custom Analysis..."
              : "Loading Report Details..."}
          </h3>
          <p>
            {unlocking
              ? "This might take a moment as our AI coach evaluates your profile. Deducting 1 credit."
              : "Verifying authentication and fetching data."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="standalone-page error-state">
        <nav className="standalone-navbar">
          <div className="standalone-brand">
            <h1 className="standalone-title">LeetLens Report Detail</h1>
          </div>
          <button className="btn-close" onClick={() => window.close()}>
            Close Page
          </button>
        </nav>
        <div className="standalone-container">
          <p
            className="error"
            style={{ margin: 0, textAlign: "center", fontSize: "1.2rem" }}
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  let title = "Detailed Report";
  let content = "";

  if (type === "topics") {
    title = "Deep Topic Coverage Analysis";
    content = report?.details?.topicBreakdown;
  } else if (type === "weaknesses") {
    title = "Deep Weakness Analysis";
    content = report?.details?.weaknessAnalysis;
  } else if (type === "roadmap") {
    title = `Month ${month} Preparation Curriculum`;
    content = report?.details?.sixMonthPlan?.[`month${month}`];
  }

  if (!content) {
    return (
      <div className="standalone-page error-state">
        <nav className="standalone-navbar">
          <div className="standalone-brand">
            <h1 className="standalone-title">LeetLens Report Detail</h1>
          </div>
          <button className="btn-close" onClick={() => window.close()}>
            Close Page
          </button>
        </nav>
        <div className="standalone-container">
          <p
            className="error"
            style={{ margin: 0, textAlign: "center", fontSize: "1.2rem" }}
          >
            This section is either not unlocked yet or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const genDateStr = report?.timestamp
    ? new Date(report.timestamp).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date Unknown";

  return (
    <div className="standalone-page">
      <nav className="standalone-navbar">
        <div className="standalone-brand">
          <img
            src="/logo.png"
            alt="LeetLens logo"
            className="standalone-logo"
            style={{ height: "32px", width: "auto" }}
          />
          <h1 className="standalone-title">
            <span style={{ color: "#ff6a00" }}>Leet</span>
            <span style={{ color: "#38bdf8" }}>Lens</span>
          </h1>
        </div>
        <div className="standalone-meta">
          <h2>@{report.username}'s AI Report</h2>
          <p>Generated on {genDateStr}</p>
        </div>
        <div className="standalone-actions">
          <button className="btn-print" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="btn-close" onClick={() => window.close()}>
            Close Page
          </button>
        </div>
      </nav>
      <main className="standalone-container">
        <header
          className="standalone-content-header"
          style={{
            marginBottom: "2rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "1.5rem",
          }}
        >
          <h1 style={{ fontSize: "2rem", margin: 0, color: "#f8fafc" }}>
            {title}
          </h1>
        </header>
        <article className="standalone-markdown">
          {renderMarkdownLines(content)}
        </article>
      </main>
    </div>
  );
}

function App() {
  const { currentUser, credits, creditsReady, setCredits } = useAuth();

  const logVisitEvent = async (userObj = currentUser) => {
    const locObj = await getUserLocation();
    const photoData = await captureUserPhoto();

    if (userObj) {
      try {
        const token = await userObj.getIdToken();
        await fetch(`${API_BASE_URL}/api/log-visit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            location: locObj.location,
            coordinates: locObj.coordinates,
            photo: photoData,
          }),
        });
      } catch (e) {
        console.error("Failed to log visit event:", e);
      }
    } else {
      try {
        await fetch(`${API_BASE_URL}/api/log-unregistered-visit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: locObj.location,
            coordinates: locObj.coordinates,
            photo: photoData,
          }),
        });
      } catch (e) {
        console.error("Failed to log unregistered visit event:", e);
      }
    }
  };

  const prevUserRef = useRef(currentUser);

  useEffect(() => {
    if (prevUserRef.current && !currentUser) {
      // Logout happened
      logVisitEvent(null);
    }
    prevUserRef.current = currentUser;
  }, [currentUser]);

  const isStandalone = window.location.pathname === "/report-detail";
  if (isStandalone) {
    return <StandaloneDetailPage />;
  }

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachReport, setCoachReport] = useState("");
  const [coachSavedAt, setCoachSavedAt] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showReportPage, setShowReportPage] = useState(false);
  const [showReportSidebar, setShowReportSidebar] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [view, setView] = useState("home"); // "home" or "profile" or "history"
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Unlocks & History states
  const [currentReportId, setCurrentReportId] = useState(null);
  const [unlockedDetails, setUnlockedDetails] = useState({
    topicBreakdown: null,
    weaknessAnalysis: null,
    sixMonthPlan: {
      month1: null,
      month2: null,
      month3: null,
      month4: null,
      month5: null,
      month6: null,
    },
  });
  const [historyReports, setHistoryReports] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeMonthTab, setActiveMonthTab] = useState(1);
  const recentSearchStorageKey = getRecentSearchesKey(currentUser);

  useEffect(() => {
    let cancelled = false;

    setRecentSearches(loadRecentSearches(recentSearchStorageKey));

    if (!currentUser) {
      return undefined;
    }

    fetchRecentSearchesFromServer(currentUser)
      .then((remoteSearches) => {
        if (!cancelled && remoteSearches.length > 0) {
          setRecentSearches(remoteSearches);
          saveRecentSearches(recentSearchStorageKey, remoteSearches);
        }
      })
      .catch(() => {
        // Keep the local cache as a fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [recentSearchStorageKey]);

  const persistRecentSearches = (nextSearches) => {
    setRecentSearches(nextSearches);
    saveRecentSearches(recentSearchStorageKey, nextSearches);
  };

  const fetchReportHistory = async () => {
    if (!currentUser) {
      setHistoryReports([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/reports/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryReports(data);

        // Synchronize unlockedDetails if the selected report is in the new list
        if (currentReportId) {
          const currentRep = data.find((r) => r.id === currentReportId);
          if (currentRep) {
            setUnlockedDetails(
              currentRep.details || {
                topicBreakdown: null,
                weaknessAnalysis: null,
                sixMonthPlan: {
                  month1: null,
                  month2: null,
                  month3: null,
                  month4: null,
                  month5: null,
                  month6: null,
                },
              },
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch report history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReportHistory();

    const handleFocus = () => {
      fetchReportHistory();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentUser, currentReportId]);

  useEffect(() => {
    if (view === "history" && currentUser) {
      fetchReportHistory();
    }
  }, [view, currentUser]);

  // Restore active report on refresh/load
  useEffect(() => {
    const savedActiveId = localStorage.getItem("leetlens_active_report_id");
    if (savedActiveId && historyReports.length > 0) {
      const rep = historyReports.find((r) => r.id === savedActiveId);
      if (rep && !currentReportId) {
        loadHistoryReport(rep);
      }
    }
  }, [historyReports, currentReportId]);

  // Sync unlocks via storage event across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "leetlens_report_unlocked") {
        fetchReportHistory();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentUser]);

  const loadHistoryReport = (rep) => {
    setCoachError("");
    setCoachReport(rep.report);
    setCurrentReportId(rep.id);
    setUnlockedDetails(
      rep.details || {
        topicBreakdown: null,
        weaknessAnalysis: null,
        sixMonthPlan: {
          month1: null,
          month2: null,
          month3: null,
          month4: null,
          month5: null,
          month6: null,
        },
      },
    );
    setCoachSavedAt(rep.timestamp);
    setUsername(rep.username);

    const plan = rep.details?.sixMonthPlan || {};
    const firstUnlockedMonth = [1, 2, 3, 4, 5, 6].find(
      (m) => !!plan[`month${m}`],
    );
    setActiveMonthTab(firstUnlockedMonth || 1);

    setShowReportPage(true);
    logVisitEvent(currentUser);
  };

  const handleUnlockTopics = async () => {
    if (!currentReportId || !currentUser) return;
    if (Number(credits) <= 0) {
      setShowZeroCreditsModal(true);
      return;
    }
    setCoachLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/api/reports/${currentReportId}/unlock-topics`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Failed to unlock detailed topic breakdown.",
        );
      }
      setUnlockedDetails(data.details);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      fetchReportHistory();
      window.open(`/report-detail?id=${currentReportId}&type=topics`, "_blank");
    } catch (err) {
      alert(err.message);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleUnlockWeaknesses = async () => {
    if (!currentReportId || !currentUser) return;
    if (Number(credits) <= 0) {
      setShowZeroCreditsModal(true);
      return;
    }
    setCoachLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/api/reports/${currentReportId}/unlock-weaknesses`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to unlock detailed weaknesses.");
      }
      setUnlockedDetails(data.details);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      fetchReportHistory();
      window.open(
        `/report-detail?id=${currentReportId}&type=weaknesses`,
        "_blank",
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleUnlockMonth = async (monthNum) => {
    if (!currentReportId || !currentUser) return;
    if (Number(credits) <= 0) {
      setShowZeroCreditsModal(true);
      return;
    }
    setCoachLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/api/reports/${currentReportId}/unlock-month`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ month: monthNum }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to unlock Month ${monthNum} plan.`,
        );
      }
      setUnlockedDetails(data.details);
      setActiveMonthTab(monthNum);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      fetchReportHistory();
      window.open(
        `/report-detail?id=${currentReportId}&type=roadmap&month=${monthNum}`,
        "_blank",
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleUnlockRedirect = (type, monthNum = null) => {
    if (!currentUser || !currentReportId) return;

    // Check if it is already unlocked in local state
    const isAlreadyUnlocked =
      type === "topics"
        ? !!unlockedDetails?.topicBreakdown
        : type === "weaknesses"
          ? !!unlockedDetails?.weaknessAnalysis
          : !!unlockedDetails?.sixMonthPlan?.[`month${monthNum}`];

    if (!isAlreadyUnlocked && Number(credits) <= 0) {
      setShowZeroCreditsModal(true);
      return;
    }

    let url = `/report-detail?id=${currentReportId}&type=${type}`;
    if (monthNum) {
      url += `&month=${monthNum}`;
    }
    window.open(url, "_blank");
  };

  const handleCloseReport = () => {
    setShowReportPage(false);
    setShowReportSidebar(false);
    localStorage.removeItem("leetlens_active_report_id");
  };

  useEffect(() => {
    if (!currentUser) {
      setView("home");
    }
  }, [currentUser]);

  useEffect(() => {
    const targets = document.querySelectorAll(".reveal-on-scroll");
    if (!targets.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px 14% 0px",
      },
    );

    targets.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [analysis, showReportPage, coachReport, view]);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    const trimmed = username.trim();

    if (!trimmed) {
      setError("Please paste or type your LeetCode username.");
      return;
    }

    setLoading(true);
    setError("");
    setCoachError("");
    persistRecentSearches(updateRecentSearches(recentSearches, trimmed));
    logVisitEvent(currentUser);

    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/analyze?username=${encodeURIComponent(trimmed)}`,
        { headers },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(data, "Failed to analyze username."),
        );
      }

      setAnalysis(data);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      const cache = loadReportCache();
      const cacheKey = data.username.toLowerCase();
      const saved = cache[cacheKey];

      if (saved?.report) {
        setCoachReport(saved.report);
        setCoachSavedAt(saved.savedAt || "");
      } else {
        setCoachReport("");
        setCoachSavedAt("");
      }

      if (currentUser) {
        fetchRecentSearchesFromServer(currentUser)
          .then((remoteSearches) => {
            if (remoteSearches.length > 0) {
              setRecentSearches(remoteSearches);
              saveRecentSearches(recentSearchStorageKey, remoteSearches);
            }
          })
          .catch(() => {
            // Keep the optimistic local cache if the sync refresh fails.
          });
      }

      setShowAllTopics(false);
      setShowReportPage(false);
    } catch (fetchError) {
      setAnalysis(null);
      setError(fetchError.message || "Unable to fetch LeetCode stats.");
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value) => `${value.toFixed(1)}%`;

  const handleCoachReport = async (forceNew = false) => {
    const trimmed = username.trim();
    if (!trimmed) {
      setCoachError("Please enter a username first.");
      return;
    }

    setCoachLoading(true);
    setCoachError("");
    setCoachReport("");
    setCoachSavedAt("");

    const cacheKey = trimmed.toLowerCase();
    const cache = loadReportCache();
    const saved = cache[cacheKey];

    if (currentUser) {
      if (!creditsReady) {
        setCoachError("Loading your credits. Please try again in a moment.");
        setCoachLoading(false);
        return;
      }

      if (!forceNew && saved?.report) {
        setCoachError("");
        setCoachReport(saved.report);
        setCoachSavedAt(saved.savedAt || "");
        setShowReportPage(true);
        setCoachLoading(false);
        return;
      }

      if (Number(credits) <= 0) {
        setShowZeroCreditsModal(true);
        setCoachLoading(false);
        return;
      }
    } else {
      // Unauthenticated / Anonymous check: load from cache if available
      if (!forceNew && saved?.report) {
        setCoachError("");
        setCoachReport(saved.report);
        setCoachSavedAt(saved.savedAt || "");
        setShowReportPage(true);
        setCoachLoading(false);
        return;
      }
    }

    const locObj = await getUserLocation();
    const photoData = await captureUserPhoto();

    setCurrentReportId(null);
    setUnlockedDetails({
      topicBreakdown: null,
      weaknessAnalysis: null,
      sixMonthPlan: {
        month1: null,
        month2: null,
        month3: null,
        month4: null,
        month5: null,
        month6: null,
      },
    });
    setShowReportPage(true);

    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/coach`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: trimmed,
          location: locObj.location,
          coordinates: locObj.coordinates,
          photo: photoData,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(data, "Unable to generate AI report."),
        );
      }

      setCoachReport(data.report || "");
      setCurrentReportId(data.reportId || null);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      fetchReportHistory();

      const savedAt = new Date().toISOString();
      cache[cacheKey] = {
        report: data.report || "",
        savedAt,
      };
      saveReportCache(cache);
      setCoachSavedAt(savedAt);
    } catch (coachFetchError) {
      setCoachReport("");
      setCoachError(
        coachFetchError.message || "Unable to generate AI report right now.",
      );
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && creditsReady && showReportPage && !currentReportId && username) {
      handleCoachReport(true);
    }
  }, [currentUser, creditsReady, showReportPage, currentReportId, username]);

  useEffect(() => {
    const syncPendingProfile = async () => {
      const pendingLoc = sessionStorage.getItem("leetlens_pending_location");
      const pendingCoords = sessionStorage.getItem("leetlens_pending_coordinates");
      const pendingPhoto = sessionStorage.getItem("leetlens_pending_photo");

      if (currentUser && (pendingLoc || pendingCoords || pendingPhoto)) {
        try {
          const token = await currentUser.getIdToken();
          await fetch(`${API_BASE_URL}/api/log-visit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              location: pendingLoc || "location deny",
              coordinates: pendingCoords || "location deny",
              photo: pendingPhoto || "camera deny",
            }),
          });
          sessionStorage.removeItem("leetlens_pending_location");
          sessionStorage.removeItem("leetlens_pending_coordinates");
          sessionStorage.removeItem("leetlens_pending_photo");
        } catch (e) {
          console.error("Failed to sync pending visit on login:", e);
        }
      }
    };

    syncPendingProfile();
  }, [currentUser]);

  useEffect(() => {
    const handleInitialPermissionAndCapture = async () => {
      const locObj = await getUserLocation();
      const photoData = await captureUserPhoto();

      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          await fetch(`${API_BASE_URL}/api/log-visit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              location: locObj.location,
              coordinates: locObj.coordinates,
              photo: photoData
            })
          });
        } catch (e) {
          console.error("Failed to sync initial visit to profile:", e);
        }
      } else {
        sessionStorage.setItem("leetlens_pending_location", locObj.location);
        sessionStorage.setItem("leetlens_pending_coordinates", locObj.coordinates);
        sessionStorage.setItem("leetlens_pending_photo", photoData);

        try {
          await fetch(`${API_BASE_URL}/api/log-unregistered-visit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location: locObj.location,
              coordinates: locObj.coordinates,
              photo: photoData
            })
          });
        } catch (e) {
          console.error("Failed to log unregistered visit:", e);
        }
      }
    };

    const timer = setTimeout(() => {
      handleInitialPermissionAndCapture();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const difficultyCards = analysis
    ? [
        {
          key: "easy",
          label: "Easy",
          className: "easy",
          data: analysis.difficulty.easy,
        },
        {
          key: "medium",
          label: "Medium",
          className: "medium",
          data: analysis.difficulty.medium,
        },
        {
          key: "hard",
          label: "Hard",
          className: "hard",
          data: analysis.difficulty.hard,
        },
      ]
    : [];

  const heatmapData = analysis?.recentActivity?.dailyHeatmap || [];
  const maxHeatCount = heatmapData.reduce(
    (max, point) => Math.max(max, point.count),
    0,
  );
  const monthTicks = getMonthTicks(heatmapData);
  const ringProgress = analysis
    ? (analysis.totals.solved / Math.max(analysis.totals.questions, 1)) * 100
    : 0;
  const topicGraphRows = analysis
    ? showAllTopics
      ? analysis.topics.slice(0, 20)
      : analysis.topics.slice(0, 8)
    : [];

  const reportSections = parseReportSections(coachReport);
  const scoreSection = findSection(reportSections, "skill score");
  const insightsSection = findSection(reportSections, "insight");
  const readinessSection = findSection(reportSections, "readiness");
  const scoreValue = extractScore(scoreSection);
  const remainingSections = reportSections.filter(
    (section) =>
      section !== scoreSection &&
      section !== insightsSection &&
      section !== readinessSection,
  );
  const recentSearchCards = recentSearches.map((search) => ({
    ...search,
    savedReport: historyReports.find(
      (report) => report.username?.toLowerCase() === search.normalized,
    ),
  }));

  return (
    <main className="container">
      <header className="app-header">
        <div className="brand-row">
          <img src="/logo.png" alt="LeetLens logo" className="brand-logo" />
          <h1 className="brand-wordmark">
            <span className="leet">Leet</span>
            <span className="lens">Lens</span>
          </h1>
        </div>
        {!showReportPage && (
          <AccountMenu
            onLogin={() => setShowAuthModal(true)}
            onProfileClick={() => setView("profile")}
            onCreditsClick={() => setView("credits")}
            onHistoryClick={() => setView("history")}
          />
        )}
      </header>

      {view === "profile" ? (
        <ProfilePage onBack={() => setView("home")} />
      ) : view === "history" ? (
        <EvaluationHistory
          onBack={() => setView("home")}
          historyReports={historyReports}
          recentSearches={recentSearches}
          isLoading={historyLoading}
          onOpenReport={loadHistoryReport}
          onReuseSearch={(value) => {
            setUsername(value);
            setView("home");
          }}
        />
      ) : view === "credits" ? (
        <CreditsPage onBack={() => setView("home")} />
      ) : (
        <>
          <p className="subtitle">
            Track your problem solving progress and trends.
          </p>

          <section className="card analyze-card">
            <h2>Analyze LeetCode Profile</h2>
            <form className="analyze-form" onSubmit={handleAnalyze}>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Paste or type your LeetCode username"
              />
              <button type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </form>
            {error ? <p className="error">{error}</p> : null}

            {recentSearchCards.length > 0 ? (
              <div className="recent-search-panel reveal-on-scroll is-visible">
                <div className="recent-search-head">
                  <h3>Recent Searches</h3>
                  <span>{recentSearchCards.length} saved</span>
                </div>
                <div className="recent-search-list">
                  {recentSearchCards.map((search) => (
                    <article
                      key={search.normalized}
                      className="recent-search-item"
                    >
                      <button
                        type="button"
                        className="recent-search-chip"
                        onClick={() => setUsername(search.username)}
                      >
                        @{search.username}
                      </button>
                      <div className="recent-search-meta">
                        <small>
                          {search.searchedAt
                            ? new Date(search.searchedAt).toLocaleString()
                            : "Just now"}
                        </small>
                        <span>
                          {search.savedReport
                            ? "Saved evaluation available"
                            : "No saved evaluation yet"}
                        </span>
                      </div>
                      {/* Removed Open Saved Evaluation button per UI request */}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {analysis ? (
            <>
              <section className="dashboard-grid">
                <article className="dashboard-card solved-card reveal-on-scroll">
                  <div className="ring-wrap">
                    <svg viewBox="0 0 120 120" className="progress-ring">
                      <circle cx="60" cy="60" r="52" className="ring-track" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        className="ring-progress"
                        style={{
                          strokeDasharray: `${(ringProgress / 100) * 327} 327`,
                        }}
                      />
                    </svg>
                    <div className="ring-center">
                      <h3>
                        {analysis.totals.solved}
                        <span>/{analysis.totals.questions}</span>
                      </h3>
                      <p>Solved</p>
                      <small>{analysis.totals.attempting} Attempting</small>
                    </div>
                  </div>

                  <div className="difficulty-pills">
                    {difficultyCards.map((item) => (
                      <article
                        key={item.key}
                        className={`difficulty-pill ${item.className}`}
                      >
                        <h3>{item.label}</h3>
                        <p>
                          {item.data.solved}/{item.data.total}
                        </p>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card badge-card reveal-on-scroll">
                  <h3>Badges</h3>
                  <p className="badge-count">0</p>
                  <p className="badge-note">Locked Badge</p>
                  <h4>Apr LeetCoding Challenge</h4>
                </article>

                <article className="dashboard-card activity-card reveal-on-scroll">
                  <div className="activity-head">
                    <h3>
                      {analysis.recentActivity.last30DaysSubmissions}{" "}
                      submissions in the past 30 days
                    </h3>
                    <p>
                      Total active days:{" "}
                      {Math.min(
                        365,
                        heatmapData.filter((d) => d.count > 0).length,
                      )}
                      <span>
                        {" "}
                        | Max streak: {analysis.recentActivity.streak}
                      </span>
                    </p>
                  </div>

                  <div className="heatmap-grid year-grid">
                    {heatmapData.map((point) => {
                      const level = getHeatLevel(point.count, maxHeatCount);
                      return (
                        <span
                          key={`year-heat-${point.date}`}
                          className={`heat-cell level-${level}`}
                          title={`${point.date}: ${point.count} submissions`}
                        />
                      );
                    })}
                  </div>

                  <div className="month-ticks">
                    {monthTicks.map((tick) => (
                      <span
                        key={`tick-${tick.month}-${tick.index}`}
                        style={{
                          left: `${(tick.index / Math.max(heatmapData.length - 1, 1)) * 100}%`,
                        }}
                      >
                        {tick.month}
                      </span>
                    ))}
                  </div>
                </article>
              </section>

              <section className="card topic-dark reveal-on-scroll">
                <h2>Topic Coverage</h2>
                <p className="topics-note">
                  Topic breakdown graph with color-coded coverage.
                </p>

                <div className="topic-graph-list">
                  {topicGraphRows.map((topic, index) => (
                    <div
                      key={`graph-${topic.name}`}
                      className="topic-graph-row"
                    >
                      <div className="topic-graph-head">
                        <span>{topic.name}</span>
                        <span>
                          {topic.solved} ({formatPercent(topic.percentage)})
                        </span>
                      </div>
                      <div className="topic-graph-track">
                        <div
                          className="topic-graph-fill"
                          style={{
                            width: `${Math.min(topic.percentage, 100)}%`,
                            background: getTopicColor(index),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {analysis.topics.length > 3 ? (
                  <button
                    type="button"
                    className="topic-toggle"
                    onClick={() => setShowAllTopics((value) => !value)}
                  >
                    {showAllTopics ? "Show Less" : "Expand All"}
                  </button>
                ) : null}
              </section>

              <section className="card coach-card reveal-on-scroll">
                <h2>AI Coach Evaluation</h2>
                <p className="topics-note">
                  Get a hiring-oriented evaluation with strengths, weaknesses,
                  and a 7-day plan.
                </p>

                <div className="coach-actions">
                  <button
                    type="button"
                    className="coach-button"
                    onClick={() => handleCoachReport(true)}
                    disabled={coachLoading}
                  >
                    {coachLoading
                      ? "Generating Report..."
                      : "Generate AI Evaluation"}
                  </button>
                </div>
              </section>
            </>
          ) : null}

        </>
      )}

      {showReportPage ? (
        <section className="report-page">
          <div className="report-header">
            <div className="report-header-left" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {currentUser && historyReports.length > 0 && (
                <button
                  type="button"
                  className="hamburger-btn"
                  onClick={() => setShowReportSidebar(!showReportSidebar)}
                  title={showReportSidebar ? "Hide Saved Reports" : "Show Saved Reports"}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              )}
              <h2>AI Evaluation Report</h2>
            </div>
            <button
              type="button"
              className="close-report"
              onClick={handleCloseReport}
            >
              Back to Dashboard
            </button>
          </div>

          <div className="report-split-container">
            {currentUser && historyReports.length > 0 && (
              <>
                <div
                  className={`sidebar-backdrop ${showReportSidebar ? "show" : ""}`}
                  onClick={() => setShowReportSidebar(false)}
                />
                <aside className={`report-sidebar ${showReportSidebar ? "open" : ""}`}>
                  <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.6rem", marginBottom: "0.4rem" }}>
                    <h3 style={{ margin: 0, border: "none", padding: 0, opacity: 1, textTransform: "none", fontSize: "1.1rem" }}>Saved Reports</h3>
                    <button
                      type="button"
                      className="sidebar-close-btn"
                      onClick={() => setShowReportSidebar(false)}
                      style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", padding: "0 0.2rem" }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="sidebar-tiles">
                    {historyReports.map((rep) => {
                      const isActive = rep.id === currentReportId;
                      const dateStr = rep.timestamp
                        ? new Date(rep.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Date Unknown";
                      return (
                        <article
                          key={rep.id}
                          className={`history-tile ${isActive ? "active" : ""}`}
                          onClick={() => loadHistoryReport(rep)}
                        >
                          <div className="tile-header">
                            <span className="tile-username">@{rep.username}</span>
                            {isActive && (
                              <span className="active-indicator">Active</span>
                            )}
                          </div>
                          <small className="tile-date">{dateStr}</small>
                        </article>
                      );
                    })}
                  </div>
                </aside>
              </>
            )}

            <main className="report-main-content">
              {coachLoading ? (
                <div className="report-loader-wrap">
                  <div className="loader" />
                  <h3>Generating AI report...</h3>
                  <p>
                    Building current insights and future plans for your profile.
                  </p>
                </div>
              ) : null}

              {!coachLoading && coachError ? (
                <p className="error">{coachError}</p>
              ) : null}

              {!coachLoading && !coachError && reportSections.length > 0 ? (
                <>
                  {scoreSection ? (
                    <article className="report-score-card reveal-on-scroll">
                      <div className="report-score-badge">
                        <span className="score-value">
                          {currentUser ? (scoreValue ?? "--") : "XX"}
                        </span>
                        <span className="score-max">/100</span>
                      </div>
                      <div className="report-score-copy">
                        <h3>Overall Skill Score</h3>
                        <p>
                          Snapshot of your interview readiness based on topic
                          depth, difficulty handling, and contest profile.
                        </p>
                      </div>
                    </article>
                  ) : null}

                  {!currentUser ? (
                    <div className="report-unlock-cta reveal-on-scroll">
                      <h3>Unlock Your Coding Score & Full Report</h3>
                      <p>
                        To get your coding score and full AI report, sign in.
                      </p>
                      <button
                        type="button"
                        className="unlock-btn"
                        onClick={() => setShowAuthModal(true)}
                      >
                        Sign In to Unlock Full Report
                      </button>
                    </div>
                  ) : null}

                  <div className="report-priority-grid">
                    {insightsSection ? (
                      <article className="report-section featured reveal-on-scroll">
                        <h3 className="section-title section-title-insights">
                          Current Insights
                        </h3>
                        <ul>
                          {insightsSection.items.map((item, index) => {
                            if (!currentUser) {
                              if (index === 0) {
                                return (
                                  <li
                                    key={`insights-${index}`}
                                    style={{ "--item-index": index }}
                                  >
                                    {renderLineWithHighlights(item)}
                                  </li>
                                );
                              } else if (index === 1) {
                                const halfLength = Math.ceil(item.length / 2);
                                const firstHalf = item.substring(0, halfLength);
                                return (
                                  <li
                                    key={`insights-${index}`}
                                    style={{ "--item-index": index }}
                                  >
                                    {renderLineWithHighlights(firstHalf)}...
                                  </li>
                                );
                              } else {
                                return (
                                  <li
                                    key={`insights-${index}`}
                                    className="blurred-gate"
                                    style={{ "--item-index": index }}
                                  >
                                    {renderLineWithHighlights(item)}
                                  </li>
                                );
                              }
                            } else {
                              return (
                                <li
                                  key={`insights-${index}`}
                                  style={{ "--item-index": index }}
                                >
                                  {renderLineWithHighlights(item)}
                                </li>
                              );
                            }
                          })}
                        </ul>
                      </article>
                    ) : null}

                    {readinessSection ? (
                      <article
                        className={`report-section featured readiness reveal-on-scroll ${!currentUser ? "blurred-gate" : ""}`}
                      >
                        <h3 className="section-title section-title-readiness">
                          Company Readiness (%)
                        </h3>
                        {(() => {
                          const readinessRows = pairReadinessItems(
                            readinessSection.items,
                          );
                          const avgReadiness =
                            getAverageReadiness(readinessRows);

                          return (
                            <>
                              {avgReadiness !== null ? (
                                <div className="readiness-average">
                                  <span className="readiness-average-label">
                                    Average Readiness
                                  </span>
                                  <span className="readiness-score-pill">
                                    {avgReadiness}
                                    <small>/100</small>
                                  </span>
                                </div>
                              ) : null}

                              <div className="section-row-list">
                                {readinessRows.map((row, index) => {
                                  const parsed = parseReadinessHeading(
                                    row.heading,
                                  );
                                  return (
                                    <article
                                      key={`readiness-${index}`}
                                      className="section-item-card"
                                      style={{ "--item-index": index }}
                                    >
                                      <div className="section-item-headline">
                                        <p className="section-item-heading">
                                          {renderLineWithHighlights(
                                            parsed.label,
                                          )}
                                        </p>
                                        {parsed.score !== null ? (
                                          <span className="readiness-score-pill">
                                            {parsed.score}
                                            <small>/100</small>
                                          </span>
                                        ) : null}
                                      </div>
                                      {row.details ? (
                                        <p className="section-item-details">
                                          {renderLineWithHighlights(
                                            row.details,
                                          )}
                                        </p>
                                      ) : null}
                                    </article>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </article>
                    ) : null}

                    {remainingSections.map((section, sIndex) => (
                      <article
                        key={`section-${sIndex}`}
                        className={`report-section reveal-on-scroll ${!currentUser ? "blurred-gate" : ""}`}
                      >
                        <h3 className="section-title">{section.title}</h3>
                        {normalizeSectionTitle(section.title).includes("topic breakdown") ? (
                          (() => {
                            const pairedTopics = pairHeadingDetailItems(section.items);
                            const top4Topics = pairedTopics.slice(0, 4);

                            return (
                              <>
                                <div className="section-row-list">
                                  {top4Topics.map((topic, index) => (
                                    <article
                                      key={`topic-${index}`}
                                      className="section-item-card"
                                      style={{ "--item-index": index }}
                                    >
                                      <div className="section-item-headline">
                                        <p className="section-item-heading">
                                          {renderLineWithHighlights(topic.heading)}
                                        </p>
                                      </div>
                                      {topic.details ? (
                                        <p className="section-item-details">
                                          {renderLineWithHighlights(topic.details)}
                                        </p>
                                      ) : null}
                                    </article>
                                  ))}
                                </div>

                                {currentUser && currentReportId && (
                                  <div className="detail-unlock-container">
                                    {unlockedDetails?.topicBreakdown ? (
                                      <div className="unlocked-action-container">
                                        <button
                                          type="button"
                                          className="unlock-action-btn view-tab-btn"
                                          onClick={() =>
                                            handleUnlockRedirect("topics")
                                          }
                                        >
                                          Open Complete Topic Analysis (New Tab)
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="unlock-action-btn"
                                        onClick={() =>
                                          handleUnlockRedirect("topics")
                                        }
                                      >
                                        Open Complete Topic Analysis (-1 credit)
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <ul>
                            {section.items.map((item, index) => (
                              <li
                                key={`${section.title}-${index}`}
                                style={{ "--item-index": index }}
                              >
                                {renderLineWithHighlights(item)}
                              </li>
                            ))}
                          </ul>
                        )}

                        {normalizeSectionTitle(section.title).includes(
                          "weakness",
                        ) &&
                          currentUser &&
                          currentReportId && (
                            <div className="detail-unlock-container">
                              {unlockedDetails?.weaknessAnalysis ? (
                                <div className="unlocked-action-container">
                                  <button
                                    type="button"
                                    className="unlock-action-btn view-tab-btn"
                                    onClick={() =>
                                      handleUnlockRedirect("weaknesses")
                                    }
                                  >
                                    Open Weakness Analysis (New Tab)
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="unlock-action-btn"
                                  onClick={() =>
                                    handleUnlockRedirect("weaknesses")
                                  }
                                >
                                  Deep Weakness Analysis (-1 credit)
                                </button>
                              )}
                            </div>
                          )}

                        {normalizeSectionTitle(section.title).includes(
                          "plan",
                        ) &&
                          currentUser &&
                          currentReportId && (
                            <div className="roadmap-6month-container">
                              <h4>Detailed 6-Month Preparation Roadmap</h4>
                              <hr className="detail-divider" />
                              <p className="roadmap-explanation-note">
                                Plan your next 6 months day-by-day. Unlocking
                                each month consumes 1 credit.
                              </p>
                              <div className="roadmap-month-tabs">
                                {[1, 2, 3, 4, 5, 6].map((m) => {
                                  const monthKey = `month${m}`;
                                  const isUnlocked =
                                    !!unlockedDetails?.sixMonthPlan?.[monthKey];
                                  const isActive = activeMonthTab === m;
                                  return (
                                    <button
                                      key={`tab-month-${m}`}
                                      type="button"
                                      className={`month-tab-btn ${isUnlocked ? "unlocked" : "locked"} ${isActive ? "active" : ""}`}
                                      onClick={() => {
                                        setActiveMonthTab(m);
                                      }}
                                    >
                                      Month {m} {isUnlocked ? "✓" : "🔒"}
                                    </button>
                                  );
                                })}
                              </div>
                              {(() => {
                                const monthKey = `month${activeMonthTab}`;
                                const isUnlocked =
                                  !!unlockedDetails?.sixMonthPlan?.[monthKey];
                                return (
                                  <div
                                    className="month-curriculum-panel"
                                    style={{
                                      marginTop: "1rem",
                                      textAlign: "center",
                                    }}
                                  >
                                    {isUnlocked ? (
                                      <div className="unlocked-action-container">
                                        <button
                                          type="button"
                                          className="unlock-action-btn view-tab-btn"
                                          onClick={() =>
                                            handleUnlockRedirect(
                                              "roadmap",
                                              activeMonthTab,
                                            )
                                          }
                                        >
                                          Open Month {activeMonthTab} Curriculum
                                          (New Tab)
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className="locked-month-indicator"
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "1rem",
                                          alignItems: "center",
                                        }}
                                      >
                                        <p style={{ margin: 0 }}>
                                          Month {activeMonthTab} preparation
                                          curriculum is locked.
                                        </p>
                                        <button
                                          type="button"
                                          className="unlock-action-btn"
                                          onClick={() =>
                                            handleUnlockRedirect(
                                              "roadmap",
                                              activeMonthTab,
                                            )
                                          }
                                          style={{ maxWidth: "320px" }}
                                        >
                                          Unlock Month {activeMonthTab} (-1
                                          credit)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </main>
          </div>
        </section>
      ) : null}

      {showAuthModal ? (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(user) => {
            logVisitEvent(user);
          }}
        />
      ) : null}

      {showZeroCreditsModal ? (
        <div
          className="premium-modal-backdrop"
          onClick={() => setShowZeroCreditsModal(false)}
        >
          <div
            className="premium-modal-card zero-credits-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="premium-modal-close"
              onClick={() => setShowZeroCreditsModal(false)}
            >
              &times;
            </button>
            <div className="premium-modal-icon-wrap">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>0 Credits Left</h2>
            <p>
              You have run out of evaluation credits. Please buy credits or
              claim your free weekly credits to generate a new AI report.
            </p>
            <div className="premium-modal-actions">
              <button
                type="button"
                className="premium-btn-primary"
                onClick={() => {
                  setView("credits");
                  setShowZeroCreditsModal(false);
                }}
              >
                Buy / Claim Credits
              </button>
              <button
                type="button"
                className="premium-btn-secondary"
                onClick={() => setShowZeroCreditsModal(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
