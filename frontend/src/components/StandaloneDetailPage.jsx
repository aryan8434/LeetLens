import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Fade from "@mui/material/Fade";
import { alpha, useTheme } from "@mui/material/styles";

import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { useAuth } from "../contexts/AuthContext";
import { BrandMark, GlassCard, ScanBar, RotatingStatus, TypingDots } from "./ui";
import { renderMarkdownLines } from "../utils/report";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

const UNLOCK_STATUS = [
  "Pulling your full profile snapshot…",
  "Running the deep-dive analysis…",
  "Structuring the curriculum…",
];

/**
 * Rendered at /report-detail — a printable deep-dive page opened in a new tab
 * for unlocked topic / weakness / roadmap sections.
 */
export default function StandaloneDetailPage() {
  const { currentUser } = useAuth();
  const theme = useTheme();
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
        const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
            JSON.stringify({ reportId, timestamp: Date.now() }),
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

    return undefined;
  }, [currentUser, reportId, type, month]);

  const shell = (children) => (
    <Box sx={{ minHeight: "100vh", px: { xs: 1.5, sm: 3 }, pb: 6 }}>{children}</Box>
  );

  if (loading) {
    return shell(
      <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlassCard
          interactive={false}
          glow
          sx={{ p: { xs: 3, sm: 5 }, maxWidth: 480, width: "100%", textAlign: "center" }}
        >
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <BrandMark size={38} />
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", alignItems: "center" }}>
            <Typography variant="h6">
              {unlocking ? "Generating custom analysis" : "Loading report"}
            </Typography>
            <TypingDots />
          </Stack>
          <RotatingStatus
            messages={
              unlocking
                ? UNLOCK_STATUS
                : ["Verifying authentication and fetching your data…"]
            }
            sx={{ mt: 1.5, mb: 3 }}
          />
          <ScanBar />
          {unlocking ? (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
              This deducts 1 credit from your balance.
            </Typography>
          ) : null}
        </GlassCard>
      </Stack>,
    );
  }

  let title = "Detailed report";
  let content = "";

  if (type === "topics") {
    title = "Deep topic coverage analysis";
    content = report?.details?.topicBreakdown;
  } else if (type === "weaknesses") {
    title = "Deep weakness analysis";
    content = report?.details?.weaknessAnalysis;
  } else if (type === "roadmap") {
    title = `Month ${month} preparation curriculum`;
    content = report?.details?.sixMonthPlan?.[`month${month}`];
  }

  const displayError =
    error || (!content ? "This section is either not unlocked yet or does not exist." : "");

  const navBar = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", position: "sticky",
        top: 0,
        zIndex: 10,
        py: 2,
        mb: 3,
        backdropFilter: "blur(14px)",
        background: alpha(theme.palette.background.default, 0.8),
        borderBottom: `1px solid ${theme.ll.border}`,
        "@media print": { display: "none" }, }}>
      <BrandMark size={30} />

      {report ? (
        <Box sx={{ textAlign: { xs: "left", sm: "center" }, flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            @{report.username}'s AI report
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {report.timestamp
              ? new Date(report.timestamp).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Date unknown"}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          startIcon={<PrintRoundedIcon />}
          onClick={() => window.print()}
        >
          Print / PDF
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CloseRoundedIcon />}
          onClick={() => window.close()}
        >
          Close
        </Button>
      </Stack>
    </Stack>
  );

  if (displayError) {
    return shell(
      <Box sx={{ maxWidth: 1000, mx: "auto" }}>
        {navBar}
        <Alert severity="error" sx={{ mt: 4 }}>
          {displayError}
        </Alert>
      </Box>,
    );
  }

  return shell(
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      {navBar}

      <Fade in timeout={500}>
        <GlassCard interactive={false} sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "2rem" },
              background: theme.ll.gradientBrand,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              height: 3,
              width: 72,
              borderRadius: 999,
              mb: 3,
              background: theme.ll.gradientPrimary,
            }}
          />
          <Box sx={{ "& > *:first-of-type": { mt: 0 } }}>{renderMarkdownLines(content)}</Box>
        </GlassCard>
      </Fade>
    </Box>,
  );
}
