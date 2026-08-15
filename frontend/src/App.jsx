import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

import { useAuth } from "./contexts/AuthContext";
import { useColorMode } from "./theme/ColorModeContext";

import AccountMenu from "./components/AccountMenu";
import AppNavDrawer from "./components/AppNavDrawer";
import AuthPage from "./components/AuthPage";
import CreditsPage from "./components/CreditsPage";
import EvaluationHistory from "./components/EvaluationHistory";
import LandingPage from "./components/LandingPage";
import ProfileDashboard from "./components/ProfileDashboard";
import ProfilePage from "./components/ProfilePage";
import ReportView from "./components/ReportView";
import ResumeAnalyzer from "./components/ResumeAnalyzer";
import StandaloneDetailPage from "./components/StandaloneDetailPage";
import ZeroCreditsDialog from "./components/ZeroCreditsDialog";
import { BrandMark, GlassCard, PulseButton, Reveal, SectionHeading } from "./components/ui";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

const REPORT_CACHE_KEY = "leetlensCoachReports_v2";
const RECENT_SEARCHES_KEY = "leetlensRecentSearches_v1";

const EMPTY_UNLOCKED_DETAILS = {
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
};

function getApiErrorMessage(data, fallback) {
  const base = data?.error || fallback;
  const details = data?.details || "";

  if (
    base.toLowerCase().includes("not found") ||
    base.toLowerCase().includes("does not exist") ||
    details.toLowerCase().includes("not found") ||
    details.toLowerCase().includes("does not exist")
  ) {
    return "LeetCode username not found. Please recheck the username and try again.";
  }

  if (details && details !== base) {
    return `${base} (${details})`;
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

function updateRecentSearches(searches, username) {
  const normalized = normalizeSearchValue(username);
  const next = [
    { username, normalized, searchedAt: new Date().toISOString() },
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
    headers: { Authorization: `Bearer ${token}` },
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
            { headers: { "User-Agent": "LeetLens/1.0" } },
          );
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          const address = data.address || {};
          const city =
            address.city || address.town || address.village || address.suburb || "";
          const country = address.country || "";
          if (city && country) {
            resolve({ location: `${city}, ${country}`, coordinates: coordsStr });
          } else if (country) {
            resolve({ location: country, coordinates: coordsStr });
          } else {
            resolve({
              location:
                data.display_name ||
                `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
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
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 0 },
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

/* ================================================================== *
 * Dashboard search panel
 * ================================================================== */

function AnalyzeSearchCard({
  username,
  onUsernameChange,
  onSubmit,
  loading,
  error,
  recentSearches,
  onPickRecent,
  onResumeClick,
}) {
  const theme = useTheme();

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Reveal>
        <GlassCard interactive={false} glow sx={{ p: { xs: 2.25, sm: 3.5 } }}>
          <Stack spacing={1} sx={{ alignItems: "center", mb: 3, textAlign: "center" }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: "1.5rem", sm: "2.1rem" },
                background: theme.ll.gradientBrand,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "ll-gradient-pan 7s ease infinite",
              }}
            >
              Analyze a LeetCode profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
              Enter a username to pull solved distributions, streaks, topic coverage and a
              hiring-focused readiness report.
            </Typography>
          </Stack>

          <Box component="form" onSubmit={onSubmit}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                placeholder="Paste or type a LeetCode username"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon sx={{ color: "text.disabled" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <PulseButton
                type="submit"
                size="large"
                disabled={loading}
                gradient={theme.ll.gradientPrimary}
                endIcon={!loading ? <ArrowForwardRoundedIcon /> : null}
                sx={{ flexShrink: 0, minWidth: { sm: 168 } }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Analyze"}
              </PulseButton>
            </Stack>
          </Box>

          <Collapse in={Boolean(error)}>
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          </Collapse>

          {recentSearches.length > 0 ? (
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25 }}>
                <HistoryRoundedIcon sx={{ fontSize: 17, color: "text.disabled" }} />
                <Typography variant="overline" color="text.secondary">
                  Recent searches
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {recentSearches.map((search, index) => (
                  <Chip
                    key={search.normalized}
                    label={`@${search.username}`}
                    onClick={() => onPickRecent(search.username)}
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      animation: "ll-pop-in .4s cubic-bezier(.22,1,.36,1) both",
                      animationDelay: `${index * 70}ms`,
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
        </GlassCard>
      </Reveal>

      <Reveal delay={80}>
        <GlassCard accent={theme.palette.secondary.main} sx={{ p: { xs: 2, sm: 3 } }}>
          <SectionHeading
            icon={<DescriptionRoundedIcon />}
            accent={theme.palette.secondary.main}
            title="Resume & JD matcher"
            subtitle="Upload a PDF or paste text for an instant ATS and recruiter evaluation."
            sx={{ mb: 2 }}
            action={
              <PulseButton
                onClick={onResumeClick}
                endIcon={<ArrowForwardRoundedIcon />}
                gradient={theme.ll.gradientWarm}
                sx={{
                  color: "#1a0e00",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Open matcher
              </PulseButton>
            }
          />
        </GlassCard>
      </Reveal>
    </Stack>
  );
}

/* ================================================================== *
 * Main application
 * ================================================================== */

function MainApp() {
  const theme = useTheme();
  const { mode, toggleMode } = useColorMode();
  const { currentUser, credits, creditsReady, setCredits, userProfile, signOut } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachReport, setCoachReport] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showReportPage, setShowReportPage] = useState(false);
  const [view, setView] = useState("landing");
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [currentReportId, setCurrentReportId] = useState(null);
  const [unlockedDetails, setUnlockedDetails] = useState(EMPTY_UNLOCKED_DETAILS);
  const [historyReports, setHistoryReports] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeMonthTab, setActiveMonthTab] = useState(1);

  const recentSearchStorageKey = getRecentSearchesKey(currentUser);
  const prevUserRef = useRef(currentUser);

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
          headers: { "Content-Type": "application/json" },
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

  useEffect(() => {
    if (prevUserRef.current && !currentUser) {
      // Logout happened
      logVisitEvent(null);
      setView("landing");
    }
    prevUserRef.current = currentUser;
  }, [currentUser]);

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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryReports(data);

        // Synchronize unlockedDetails if the selected report is in the new list
        if (currentReportId) {
          const currentRep = data.find((r) => r.id === currentReportId);
          if (currentRep) {
            setUnlockedDetails(currentRep.details || EMPTY_UNLOCKED_DETAILS);
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

    const handleFocus = () => fetchReportHistory();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
      const rep = historyReports.find((r) => r.id === savedActiveId && r.type !== "resume");
      if (rep && !currentReportId) {
        loadHistoryReport(rep);
      }
    }
  }, [historyReports, currentReportId]);

  // Sync unlocks across tabs
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
    setUnlockedDetails(rep.details || EMPTY_UNLOCKED_DETAILS);
    setUsername(rep.username);

    const plan = rep.details?.sixMonthPlan || {};
    const firstUnlockedMonth = [1, 2, 3, 4, 5, 6].find((m) => Boolean(plan[`month${m}`]));
    setActiveMonthTab(firstUnlockedMonth || 1);

    setShowReportPage(true);
    logVisitEvent(currentUser);
  };

  const handleUnlockRedirect = (type, monthNum = null) => {
    if (!currentUser || !currentReportId) return;

    const isAlreadyUnlocked =
      type === "topics"
        ? Boolean(unlockedDetails?.topicBreakdown)
        : type === "weaknesses"
          ? Boolean(unlockedDetails?.weaknessAnalysis)
          : Boolean(unlockedDetails?.sixMonthPlan?.[`month${monthNum}`]);

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
    localStorage.removeItem("leetlens_active_report_id");
  };

  useEffect(() => {
    if (currentUser && view === "landing") {
      setView("home");
    }
  }, [currentUser, view]);

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
        throw new Error(getApiErrorMessage(data, "Failed to analyze username."));
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
      } else {
        setCoachReport("");
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
      if (!currentUser) {
        handleCoachReport(false);
      } else {
        setShowReportPage(false);
      }
    } catch (fetchError) {
      setAnalysis(null);
      setError(fetchError.message || "Unable to fetch LeetCode stats.");
    } finally {
      setLoading(false);
    }
  };

  const handleCoachReport = async (forceNew = false) => {
    const trimmed = username.trim();
    if (!trimmed) {
      setCoachError("Please enter a username first.");
      return;
    }

    setCoachLoading(true);
    setCoachError("");
    setCoachReport("");

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
        setShowReportPage(true);
        setCoachLoading(false);
        return;
      }

      if (Number(credits) <= 0) {
        setShowZeroCreditsModal(true);
        setCoachLoading(false);
        return;
      }
    } else if (!forceNew && saved?.report) {
      // Unauthenticated: reuse the cached report when we have one.
      setCoachError("");
      setCoachReport(saved.report);
      setShowReportPage(true);
      setCoachLoading(false);
      return;
    }

    const locObj = await getUserLocation();
    const photoData = await captureUserPhoto();

    setCurrentReportId(null);
    setUnlockedDetails(EMPTY_UNLOCKED_DETAILS);
    setShowReportPage(true);

    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = { "Content-Type": "application/json" };
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
        throw new Error(getApiErrorMessage(data, "Unable to generate AI report."));
      }

      setCoachReport(data.report || "");
      setCurrentReportId(data.reportId || null);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      fetchReportHistory();

      cache[cacheKey] = { report: data.report || "", savedAt: new Date().toISOString() };
      saveReportCache(cache);
    } catch (coachFetchError) {
      setCoachReport("");
      setCoachError(coachFetchError.message || "Unable to generate AI report right now.");
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
              photo: photoData,
            }),
          });
        } catch (e) {
          console.error("Failed to sync initial visit to profile:", e);
        }
      } else {
        sessionStorage.setItem("leetlens_pending_location", locObj.location);
        sessionStorage.setItem("leetlens_pending_coordinates", locObj.coordinates);
        sessionStorage.setItem("leetlens_pending_photo", photoData);

        try {
          const response = await fetch(`${API_BASE_URL}/api/log-unregistered-visit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: locObj.location,
              coordinates: locObj.coordinates,
              photo: photoData,
            }),
          });
          const data = await response.json();
          if (data.visitId) {
            sessionStorage.setItem("leetlens_unregistered_visit_id", data.visitId);
          }
        } catch (e) {
          console.error("Failed to log unregistered visit:", e);
        }
      }
    };

    const timer = setTimeout(handleInitialPermissionAndCapture, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleZeroCreditCheckout = async (tier) => {
    try {
      const token = await currentUser.getIdToken(true);
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const orderRes = await fetch(`${API_BASE_URL}/api/credits/create-order`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ packageKey: tier.key }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed.");

      const options = {
        key:
          orderData.key_id ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          "rzp_test_TFM4cTiksu0var",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "LeetLens",
        description: `Purchase ${tier.name} for ₹${tier.priceRs}`,
        image: "/logo.png",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/credits/verify-payment`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageKey: tier.key,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setCredits(verifyData.credits);
              setShowZeroCreditsModal(false);
            } else {
              setError(verifyData.error || "Payment verification failed.");
            }
          } catch (ve) {
            setError(ve.message || "Payment verification failed.");
          }
        },
        prefill: { email: currentUser.email || "" },
        theme: { color: "#38bdf8" },
      };

      if (typeof window.Razorpay !== "function") {
        throw new Error("Razorpay SDK not loaded. Please refresh.");
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setError(e.message || "Purchase failed.");
    }
  };

  const navigate = (target) => {
    if (target === "landing") {
      setView("landing");
      return;
    }
    setShowReportPage(false);
    setView(target);
  };

  /* ----------------------------- render ----------------------------- */

  const renderView = () => {
    if (showReportPage) {
      return (
        <ReportView
          coachLoading={coachLoading}
          coachError={coachError}
          coachReport={coachReport}
          currentUser={currentUser}
          currentReportId={currentReportId}
          unlockedDetails={unlockedDetails}
          historyReports={historyReports}
          activeMonthTab={activeMonthTab}
          onChangeMonthTab={setActiveMonthTab}
          onUnlockRedirect={handleUnlockRedirect}
          onClose={handleCloseReport}
          onLoadHistoryReport={loadHistoryReport}
          onSignIn={() => {
            setView("auth");
            setShowReportPage(false);
          }}
        />
      );
    }

    switch (view) {
      case "landing":
        return (
          <LandingPage
            onAnalyzeClick={() => setView("home")}
            onResumeClick={() => setView("resume")}
          />
        );
      case "auth":
        return (
          <AuthPage
            onBackToLanding={() => setView("landing")}
            onAuthSuccess={(user) => {
              logVisitEvent(user);
              setView("home");
              if (username) {
                setShowReportPage(true);
              }
            }}
          />
        );
      case "profile":
        return <ProfilePage onBack={() => setView("home")} />;
      case "history":
        return (
          <EvaluationHistory
            onBack={() => setView("home")}
            historyReports={historyReports}
            isLoading={historyLoading}
            onOpenReport={loadHistoryReport}
          />
        );
      case "credits":
        return <CreditsPage onBack={() => setView("home")} />;
      case "resume":
        return (
          <ResumeAnalyzer
            onBack={() => setView("home")}
            credits={credits}
            onUpdateCredits={(newCredits) => setCredits(newCredits)}
          />
        );
      default:
        return (
          <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 6, pt: { xs: 2, sm: 3 } }}>
            <AnalyzeSearchCard
              username={username}
              onUsernameChange={setUsername}
              onSubmit={handleAnalyze}
              loading={loading}
              error={error}
              recentSearches={recentSearches}
              onPickRecent={setUsername}
              onResumeClick={() => setView("resume")}
            />

            {analysis ? (
              <ProfileDashboard
                analysis={analysis}
                showAllTopics={showAllTopics}
                onToggleTopics={() => setShowAllTopics((value) => !value)}
                onGenerateReport={() => handleCoachReport(true)}
                coachLoading={coachLoading}
              />
            ) : null}
          </Box>
        );
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ---------------- Top bar ---------------- */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: alpha(theme.palette.background.default, 0.78),
          backdropFilter: "blur(18px) saturate(160%)",
          borderBottom: `1px solid ${theme.ll.border}`,
          color: "text.primary",
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            px: { xs: 1, sm: 2.5 },
            minHeight: { xs: 58, sm: 66 },
            maxWidth: 1400,
            width: "100%",
            mx: "auto",
          }}
        >
          <Tooltip title="Menu">
            <IconButton
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              edge="start"
            >
              <MenuRoundedIcon />
            </IconButton>
          </Tooltip>

          <BrandMark
            size={30}
            onClick={() => navigate(currentUser ? "home" : "landing")}
            sx={{ mr: "auto" }}
          />

          {currentUser ? (
            <Chip
              icon={<BoltRoundedIcon />}
              label={
                <Box component="span">
                  {credits}
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    {" "}
                    credits
                  </Box>
                </Box>
              }
              onClick={() => navigate("credits")}
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                "& .MuiChip-icon": { color: "primary.main" },
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
              }}
            />
          ) : null}

          <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
            <IconButton
              onClick={toggleMode}
              aria-label="Toggle theme"
              sx={{
                // Spin the icon on every toggle for a bit of delight.
                "& svg": { transition: "transform .5s cubic-bezier(.22,1,.36,1)" },
                "&:hover svg": { transform: "rotate(90deg)" },
              }}
            >
              {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </IconButton>
          </Tooltip>

          <AccountMenu
            theme={mode}
            onToggleTheme={toggleMode}
            onLogin={() => navigate("auth")}
            onProfileClick={() => navigate("profile")}
            onCreditsClick={() => navigate("credits")}
            onHistoryClick={() => navigate("history")}
            onResumeClick={() => navigate("resume")}
          />
        </Toolbar>
      </AppBar>

      {/* ---------------- Drawer ---------------- */}
      <AppNavDrawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        view={showReportPage ? "" : view}
        onNavigate={navigate}
        currentUser={currentUser}
        userProfile={userProfile}
        credits={credits}
        mode={mode}
        onToggleTheme={toggleMode}
        onLogin={() => navigate("auth")}
        onSignOut={signOut}
      />

      {/* ---------------- Content ---------------- */}
      <Box component="main" sx={{ flex: 1, width: "100%" }}>
        <Fade in key={showReportPage ? "report" : view} timeout={420}>
          <Box>{renderView()}</Box>
        </Fade>
      </Box>

      <ZeroCreditsDialog
        open={showZeroCreditsModal}
        onClose={() => setShowZeroCreditsModal(false)}
        onManageCredits={() => {
          setShowZeroCreditsModal(false);
          navigate("credits");
        }}
        onCheckout={handleZeroCreditCheckout}
      />
    </Box>
  );
}

export default function App() {
  // The deep-dive pages open in their own tab at /report-detail and share no
  // state with the dashboard, so they short-circuit before MainApp mounts.
  if (window.location.pathname === "/report-detail") {
    return <StandaloneDetailPage />;
  }

  return <MainApp />;
}
