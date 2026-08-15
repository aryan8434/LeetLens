import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import { forwardRef } from "react";

import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

import { renderMarkdown } from "./ResumeAnalyzer";
import {
  EmptyState,
  GlassCard,
  PageHeader,
  PulseButton,
  Reveal,
  ScoreGauge,
  SectionHeading,
  scoreColor,
} from "./ui";

const SlideUp = forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function getReportScore(rep) {
  if (typeof rep.score === "number") return rep.score;
  if (!rep.report) return null;
  const m =
    rep.report.match(/(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)/i) ||
    rep.report.match(/\b(\d+)\s*\/\s*100\b/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (val >= 0 && val <= 100) return val;
  }
  return null;
}

function formatStamp(timestamp) {
  if (!timestamp) return "Date unknown";
  const d = new Date(timestamp);
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function EvaluationHistory({
  onBack,
  historyReports = [],
  isLoading = false,
  onOpenReport,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedResumeReport, setSelectedResumeReport] = useState(null);
  const [activeTab, setActiveTab] = useState("report");
  const [toast, setToast] = useState("");

  const leetcodeReports = historyReports.filter(
    (r) => r.type === "leetcode" || (r.username && r.type !== "resume"),
  );
  const resumeReports = historyReports.filter(
    (r) => r.type === "resume" || (!r.username && (r.fileName || r.content)),
  );

  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToast(`${label} copied to clipboard`);
  };

  const selectedScore = selectedResumeReport ? getReportScore(selectedResumeReport) : null;

  return (
    <Box sx={{ width: "100%", maxWidth: 1250, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 6 }}>
      <PageHeader
        title="Evaluation history"
        subtitle="Reopen past profile checks and resume evaluations — no credits spent."
        onBack={onBack}
        action={
          <Chip
            icon={<HistoryRoundedIcon />}
            label={`${historyReports.length} saved`}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        }
      />

      {isLoading ? (
        <Stack spacing={2} sx={{ alignItems: "center", py: 10 }}>
          <CircularProgress size={44} />
          <Typography variant="body2" color="text.secondary">
            Loading your saved evaluation reports…
          </Typography>
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: { xs: 2, sm: 3 },
            alignItems: "start",
          }}
        >
          {/* ---------- LeetCode reports ---------- */}
          <Reveal direction="left">
            <GlassCard interactive={false} accent={theme.palette.info.main} sx={{ p: { xs: 2, sm: 2.75 } }}>
              <SectionHeading
                icon={<RocketLaunchRoundedIcon />}
                accent={theme.palette.info.main}
                title="LeetCode analyzer"
                subtitle="Saved coding profile checkups & AI coaching"
                action={
                  <Chip
                    label={`${leetcodeReports.length} saved`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.15),
                      color: "info.main",
                      fontWeight: 700,
                    }}
                  />
                }
              />

              {leetcodeReports.length > 0 ? (
                <Stack spacing={1.5}>
                  {leetcodeReports.map((rep, index) => (
                    <Box
                      key={rep.id}
                      onClick={() => onOpenReport?.(rep)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        p: 2,
                        cursor: "pointer",
                        borderRadius: 3,
                        border: `1px solid ${theme.ll.border}`,
                        background: alpha(theme.palette.background.paper, 0.4),
                        animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                        animationDelay: `${index * 55}ms`,
                        transition:
                          "transform .28s cubic-bezier(.22,1,.36,1), border-color .28s ease, background-color .28s ease",
                        "&:hover": {
                          transform: "translateX(5px)",
                          borderColor: alpha(theme.palette.info.main, 0.45),
                          background: alpha(theme.palette.info.main, 0.07),
                        },
                        "&:active": { transform: "scale(0.99)" },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem" }} noWrap>
                          @{rep.username}
                        </Typography>
                        <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 0.35 }}>
                          <ScheduleRoundedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                          <Typography variant="caption" color="text.disabled">
                            {formatStamp(rep.timestamp)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Button
                        size="small"
                        variant="contained"
                        endIcon={<ArrowForwardRoundedIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport?.(rep);
                        }}
                        sx={{ flexShrink: 0 }}
                      >
                        Open
                      </Button>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  icon={<RocketLaunchRoundedIcon sx={{ fontSize: 42 }} />}
                  title="No LeetCode evaluations yet"
                  description="Analyze a LeetCode username from the dashboard and your reports will be listed here."
                />
              )}
            </GlassCard>
          </Reveal>

          {/* ---------- Resume reports ---------- */}
          <Reveal direction="right" delay={80}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 2.75 } }}>
              <SectionHeading
                icon={<DescriptionRoundedIcon />}
                title="Resume analyzer"
                subtitle="Saved ATS match scores & full reports"
                action={
                  <Chip
                    label={`${resumeReports.length} saved`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: "primary.main",
                      fontWeight: 700,
                    }}
                  />
                }
              />

              {resumeReports.length > 0 ? (
                <Stack spacing={1.5}>
                  {resumeReports.map((rep, index) => {
                    const score = getReportScore(rep);
                    const color = scoreColor(score, theme);

                    return (
                      <Box
                        key={rep.id}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${theme.ll.border}`,
                          background: alpha(theme.palette.background.paper, 0.4),
                          animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                          animationDelay: `${index * 55}ms`,
                          transition: "transform .28s cubic-bezier(.22,1,.36,1), border-color .28s ease",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            borderColor: alpha(theme.palette.primary.main, 0.42),
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.98rem", wordBreak: "break-word" }}>
                              {rep.fileName || "Resume analysis"}
                            </Typography>
                            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 0.35 }}>
                              <ScheduleRoundedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                              <Typography variant="caption" color="text.disabled">
                                {formatStamp(rep.timestamp)}
                              </Typography>
                            </Stack>
                          </Box>

                          {score !== null ? (
                            <Chip
                              label={`${score}/100`}
                              size="small"
                              sx={{
                                flexShrink: 0,
                                fontWeight: 800,
                                bgcolor: alpha(color, 0.16),
                                color,
                                border: `1px solid ${alpha(color, 0.42)}`,
                              }}
                            />
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            endIcon={<ArrowForwardRoundedIcon />}
                            onClick={() => {
                              setSelectedResumeReport(rep);
                              setActiveTab("report");
                            }}
                          >
                            View full report
                          </Button>
                          <Tooltip title="Copy report text">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyText(rep.report, "Report")}
                              sx={{ border: `1px solid ${theme.ll.border}`, borderRadius: 2 }}
                            >
                              <ContentCopyRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <EmptyState
                  icon={<DescriptionRoundedIcon sx={{ fontSize: 42 }} />}
                  title="No resume evaluations yet"
                  description="Run the Resume & JD Matcher and every report you generate will be saved here."
                />
              )}
            </GlassCard>
          </Reveal>
        </Box>
      )}

      {/* ---------- Saved resume detail dialog ---------- */}
      <Dialog
        open={Boolean(selectedResumeReport)}
        onClose={() => setSelectedResumeReport(null)}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreen}
        slots={{ transition: SlideUp }}
        transitionDuration={340}
      >
        {selectedResumeReport ? (
          <>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", p: { xs: 2, sm: 2.5 }, borderBottom: `1px solid ${theme.ll.border}` }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: 2.5,
                    color: "primary.main",
                    background: alpha(theme.palette.primary.main, 0.13),
                  }}
                >
                  <DescriptionRoundedIcon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontSize: "1.05rem" }} noWrap>
                    {selectedResumeReport.fileName || "Resume analysis"}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Evaluated on {formatStamp(selectedResumeReport.timestamp)}
                  </Typography>
                </Box>
              </Stack>

              <IconButton onClick={() => setSelectedResumeReport(null)} aria-label="Close">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="fullWidth"
              sx={{ borderBottom: `1px solid ${theme.ll.border}`, px: 1 }}
            >
              <Tab
                value="report"
                label="Assessment"
                icon={<InsightsRoundedIcon fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                value="resume"
                label="Resume text"
                icon={<DescriptionRoundedIcon fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                value="jd"
                label="Target JD"
                icon={<WorkRoundedIcon fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>

            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
              {activeTab === "report" ? (
                <Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center", mb: 2.5,
                      p: 2,
                      borderRadius: 3,
                      border: `1px solid ${alpha(scoreColor(selectedScore, theme), 0.3)}`,
                      background: alpha(scoreColor(selectedScore, theme), 0.07), }}>
                    {selectedScore !== null ? (
                      <ScoreGauge value={selectedScore} size={92} label="ATS" />
                    ) : null}
                    <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
                      <Typography variant="subtitle1">
                        {selectedScore !== null
                          ? `ATS score: ${selectedScore}/100`
                          : "Score unavailable"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saved evaluation — reopening it costs no credits.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={() => handleCopyText(selectedResumeReport.report, "Report")}
                    >
                      Copy
                    </Button>
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ "& > *:first-of-type": { mt: 0 } }}>
                    {renderMarkdown(
                      (selectedResumeReport.report || "")
                        .replace(
                          /^(?:#+\s*)?(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\n*/i,
                          "",
                        )
                        .replace(
                          /^\*\*(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\*\*\n*/i,
                          "",
                        ),
                    )}
                  </Box>
                </Box>
              ) : null}

              {activeTab === "resume" ? (
                <Box>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2">Saved resume / PDF text</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={() =>
                        handleCopyText(
                          selectedResumeReport.content || selectedResumeReport.resumeContent,
                          "Resume text",
                        )
                      }
                    >
                      Copy
                    </Button>
                  </Stack>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 3,
                      border: `1px solid ${theme.ll.border}`,
                      background: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.3 : 0.04),
                      color: "text.secondary",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      lineHeight: 1.65,
                    }}
                  >
                    {selectedResumeReport.content ||
                      selectedResumeReport.resumeContent ||
                      "No raw resume text recorded for this evaluation."}
                  </Box>
                </Box>
              ) : null}

              {activeTab === "jd" ? (
                <Box>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2">Target job description</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={() => handleCopyText(selectedResumeReport.jdText, "Job description")}
                    >
                      Copy
                    </Button>
                  </Stack>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 3,
                      border: `1px solid ${theme.ll.border}`,
                      background: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.3 : 0.04),
                      color: "text.secondary",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      lineHeight: 1.65,
                    }}
                  >
                    {selectedResumeReport.jdText ||
                      "No job description recorded for this evaluation."}
                  </Box>
                </Box>
              ) : null}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.ll.border}` }}>
              <PulseButton onClick={() => setSelectedResumeReport(null)}>Close</PulseButton>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2400}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
