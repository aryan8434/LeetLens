import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fade from "@mui/material/Fade";
import Grow from "@mui/material/Grow";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import {
  GlassCard,
  PulseButton,
  Reveal,
  ScanBar,
  ScoreGauge,
  RotatingStatus,
  TypingDots,
} from "./ui";
import {
  findSection,
  getAverageReadiness,
  normalizeSectionTitle,
  pairHeadingDetailItems,
  pairReadinessItems,
  parseReadinessHeading,
  parseReportSections,
  renderLineWithHighlights,
  extractScore,
} from "../utils/report";

const COACH_STATUS = [
  "Reading your solved distribution and topic depth…",
  "Benchmarking against product and service hiring bars…",
  "Identifying the weak topics costing you interviews…",
  "Drafting your preparation plan…",
];

const SIDEBAR_WIDTH = 268;

/** List of previously generated reports — a drawer on mobile, a column on desktop. */
function SavedReportsList({ historyReports, currentReportId, onOpen }) {
  const theme = useTheme();

  return (
    <Stack spacing={1}>
      {historyReports.map((rep) => {
        const isActive = rep.id === currentReportId;
        const dateStr = rep.timestamp
          ? new Date(rep.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Date unknown";

        return (
          <Box
            key={rep.id}
            onClick={() => onOpen(rep)}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              cursor: "pointer",
              border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.5) : theme.ll.border}`,
              background: isActive
                ? alpha(theme.palette.primary.main, 0.12)
                : alpha(theme.palette.background.paper, 0.4),
              transition: "transform .25s cubic-bezier(.22,1,.36,1), background-color .25s ease",
              "&:hover": {
                transform: "translateX(4px)",
                background: alpha(theme.palette.primary.main, 0.08),
              },
              "&:active": { transform: "scale(0.985)" },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                @{rep.username}
              </Typography>
              {isActive ? (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  sx={{ height: 19, fontSize: "0.62rem" }}
                />
              ) : null}
            </Stack>
            <Typography variant="caption" color="text.disabled">
              {dateStr}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

/** Unlock / open button pair used under each gated section. */
function UnlockAction({ unlocked, onClick, unlockedLabel, lockedLabel, fullWidth }) {
  return (
    <Button
      variant={unlocked ? "outlined" : "contained"}
      color={unlocked ? "success" : "primary"}
      onClick={onClick}
      fullWidth={fullWidth}
      startIcon={unlocked ? <OpenInNewRoundedIcon /> : <LockOpenRoundedIcon />}
      sx={{ mt: 2 }}
    >
      {unlocked ? unlockedLabel : lockedLabel}
    </Button>
  );
}

export default function ReportView({
  coachLoading,
  coachError,
  coachReport,
  currentUser,
  currentReportId,
  unlockedDetails,
  historyReports = [],
  activeMonthTab,
  onChangeMonthTab,
  onUnlockRedirect,
  onClose,
  onLoadHistoryReport,
  onSignIn,
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = parseReportSections(coachReport);
  const scoreSection = findSection(sections, "skill score");
  const insightsSection = findSection(sections, "insight");
  const readinessSection = findSection(sections, "readiness");
  const scoreValue = extractScore(scoreSection);
  const remainingSections = sections.filter(
    (section) =>
      section !== scoreSection && section !== insightsSection && section !== readinessSection,
  );

  const hasSidebar = Boolean(currentUser) && historyReports.length > 0;

  const sidebarContent = (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <FolderRoundedIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="subtitle2">Saved reports</Typography>
        </Stack>
        {!isDesktop ? (
          <IconButton size="small" onClick={() => setSidebarOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      <SavedReportsList
        historyReports={historyReports}
        currentReportId={currentReportId}
        onOpen={(rep) => {
          onLoadHistoryReport(rep);
          setSidebarOpen(false);
        }}
      />
    </Box>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 6 }}>
      {/* ---------------- Header ---------------- */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", position: "sticky",
          top: { xs: 60, sm: 68 },
          zIndex: 5,
          py: 1.5,
          mb: 1.5,
          backdropFilter: "blur(14px)",
          background: alpha(theme.palette.background.default, 0.75),
          borderBottom: `1px solid ${theme.ll.border}`, }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
          {hasSidebar && !isDesktop ? (
            <Tooltip title="Saved reports">
              <IconButton onClick={() => setSidebarOpen(true)} size="small">
                <MenuRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: "1.1rem", sm: "1.5rem" },
              background: theme.ll.gradientBrand,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "ll-gradient-pan 7s ease infinite",
            }}
            noWrap
          >
            AI evaluation report
          </Typography>
        </Stack>

        <Button
          onClick={onClose}
          startIcon={<ArrowBackRoundedIcon />}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Back to dashboard
          </Box>
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            Back
          </Box>
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: hasSidebar ? `${SIDEBAR_WIDTH}px 1fr` : "1fr" },
          gap: { xs: 0, lg: 3 },
          alignItems: "start",
        }}
      >
        {/* ---------------- Sidebar ---------------- */}
        {hasSidebar && isDesktop ? (
          <GlassCard
            interactive={false}
            sx={{ position: "sticky", top: 140, maxHeight: "calc(100vh - 170px)", overflowY: "auto" }}
          >
            {sidebarContent}
          </GlassCard>
        ) : null}

        {hasSidebar && !isDesktop ? (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            slotProps={{ paper: { sx: { width: { xs: "80vw", sm: 320 }, maxWidth: 340 } } }}
          >
            {sidebarContent}
          </Drawer>
        ) : null}

        {/* ---------------- Main ---------------- */}
        <Box sx={{ minWidth: 0 }}>
          {coachLoading ? (
            <Grow in timeout={400}>
              <GlassCard
                interactive={false}
                glow
                sx={{ p: { xs: 3, sm: 5 }, textAlign: "center", mt: 2 }}
              >
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", alignItems: "center" }}>
                  <Typography variant="h6">Generating your AI report</Typography>
                  <TypingDots />
                </Stack>
                <RotatingStatus messages={COACH_STATUS} sx={{ mt: 1.5, mb: 3 }} />
                <ScanBar />
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
                  Building current insights and future plans for your profile.
                </Typography>
              </GlassCard>
            </Grow>
          ) : null}

          {!coachLoading && coachError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {coachError}
            </Alert>
          ) : null}

          {!coachLoading && !coachError && sections.length > 0 ? (
            <Fade in timeout={500}>
              <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: 1 }}>
                {/* ---------- Overall score ---------- */}
                {scoreSection ? (
                  <Reveal>
                    <GlassCard glow interactive={false} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2.5, sm: 4 }} sx={{ alignItems: "center" }}>
                        {currentUser ? (
                          <ScoreGauge value={scoreValue ?? 0} size={150} label="skill" />
                        ) : (
                          <Box
                            sx={{
                              width: 150,
                              height: 150,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: "50%",
                              border: `2px dashed ${theme.ll.borderStrong}`,
                              color: "text.disabled",
                            }}
                          >
                            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                              <LockRoundedIcon sx={{ fontSize: 30 }} />
                              <Typography sx={{ fontWeight: 800, fontSize: "1.6rem" }}>
                                ??
                              </Typography>
                            </Stack>
                          </Box>
                        )}

                        <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
                          <Typography variant="h5" sx={{ mb: 1 }}>
                            Overall skill score
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                            A snapshot of your interview readiness based on topic depth, difficulty
                            handling and contest profile.
                          </Typography>
                        </Box>
                      </Stack>
                    </GlassCard>
                  </Reveal>
                ) : null}

                {/* ---------- Sign-in gate ---------- */}
                {!currentUser ? (
                  <Reveal delay={60}>
                    <GlassCard
                      accent={theme.palette.secondary.main}
                      interactive={false}
                      sx={{
                        p: { xs: 2.5, sm: 3.5 },
                        textAlign: "center",
                        background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.08)})`,
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Unlock your coding score & full report
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Sign in to reveal your score, company readiness ratings and the complete
                        preparation plan.
                      </Typography>
                      <PulseButton
                        size="large"
                        onClick={onSignIn}
                        gradient={theme.ll.gradientBrand}
                        sx={{ minWidth: 250 }}
                      >
                        Sign in to unlock
                      </PulseButton>
                    </GlassCard>
                  </Reveal>
                ) : null}

                {/* ---------- Insights + readiness ---------- */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: { xs: 2, sm: 3 },
                  }}
                >
                  {insightsSection ? (
                    <Reveal direction="left" delay={80}>
                      <GlassCard sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
                          <LightbulbRoundedIcon sx={{ color: "warning.main" }} />
                          <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
                            Current insights
                          </Typography>
                        </Stack>

                        <Stack spacing={1.25}>
                          {insightsSection.items.map((item, index) => {
                            // Non-signed-in users see the first item, half of the second,
                            // and blurred placeholders after that.
                            const locked = !currentUser && index > 1;
                            const truncated = !currentUser && index === 1;
                            const text = truncated
                              ? `${item.substring(0, Math.ceil(item.length / 2))}…`
                              : item;

                            return (
                              <Stack key={`insight-${index}`} direction="row" spacing={1.25} sx={{ alignItems: "flex-start", animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                                  animationDelay: `${index * 70}ms`,
                                  ...(locked && {
                                    filter: "blur(5px)",
                                    userSelect: "none",
                                    pointerEvents: "none",
                                  }), }}>
                                <CheckCircleRoundedIcon
                                  sx={{ fontSize: 17, color: "primary.main", mt: "3px", flexShrink: 0 }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{ color: "text.secondary", lineHeight: 1.75 }}
                                >
                                  {renderLineWithHighlights(text)}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      </GlassCard>
                    </Reveal>
                  ) : null}

                  {readinessSection ? (
                    <Reveal direction="right" delay={120}>
                      <GlassCard accent={theme.palette.info.main} sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
                          <ApartmentRoundedIcon sx={{ color: "info.main" }} />
                          <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
                            Company readiness
                          </Typography>
                        </Stack>

                        {(() => {
                          const rows = pairReadinessItems(readinessSection.items);
                          const avg = getAverageReadiness(rows);

                          return (
                            <Box
                              sx={
                                !currentUser
                                  ? { filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }
                                  : undefined
                              }
                            >
                              {avg !== null ? (
                                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2,
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    background: alpha(theme.palette.info.main, 0.1),
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`, }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Average readiness
                                  </Typography>
                                  <Typography sx={{ fontWeight: 800, color: "info.main" }}>
                                    {avg}
                                    <Box component="span" sx={{ fontSize: "0.75rem", opacity: 0.7 }}>
                                      /100
                                    </Box>
                                  </Typography>
                                </Stack>
                              ) : null}

                              <Stack spacing={1.5}>
                                {rows.map((row, index) => {
                                  const parsed = parseReadinessHeading(row.heading);
                                  const pct = parsed.score ?? 0;
                                  return (
                                    <Box
                                      key={`readiness-${index}`}
                                      sx={{
                                        animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                                        animationDelay: `${index * 70}ms`,
                                      }}
                                    >
                                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {renderLineWithHighlights(parsed.label)}
                                        </Typography>
                                        {parsed.score !== null ? (
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 800, color: "info.main", flexShrink: 0, ml: 1 }}
                                          >
                                            {parsed.score}
                                            <Box component="span" sx={{ fontSize: "0.7rem", opacity: 0.7 }}>
                                              /100
                                            </Box>
                                          </Typography>
                                        ) : null}
                                      </Stack>

                                      {parsed.score !== null ? (
                                        <Box
                                          sx={{
                                            height: 6,
                                            borderRadius: 999,
                                            overflow: "hidden",
                                            bgcolor: alpha(theme.palette.info.main, 0.14),
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              height: "100%",
                                              width: `${pct}%`,
                                              borderRadius: 999,
                                              bgcolor: "info.main",
                                              transition: "width 1s cubic-bezier(.22,1,.36,1)",
                                            }}
                                          />
                                        </Box>
                                      ) : null}

                                      {row.details ? (
                                        <Typography
                                          variant="caption"
                                          sx={{ color: "text.disabled", display: "block", mt: 0.6, lineHeight: 1.6 }}
                                        >
                                          {renderLineWithHighlights(row.details)}
                                        </Typography>
                                      ) : null}
                                    </Box>
                                  );
                                })}
                              </Stack>
                            </Box>
                          );
                        })()}
                      </GlassCard>
                    </Reveal>
                  ) : null}
                </Box>

                {/* ---------- Remaining sections ---------- */}
                {remainingSections.map((section, sIndex) => {
                  const normalized = normalizeSectionTitle(section.title);
                  const isTopicBreakdown = normalized.includes("topic breakdown");
                  const isWeakness = normalized.includes("weakness");
                  const isPlan = normalized.includes("plan");

                  return (
                    <Reveal key={`section-${sIndex}`} delay={60}>
                      <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" sx={{ mb: 2, fontSize: "1.12rem" }}>
                          {section.title}
                        </Typography>

                        <Box
                          sx={
                            !currentUser
                              ? { filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }
                              : undefined
                          }
                        >
                          {isTopicBreakdown ? (
                            <Stack spacing={1.5}>
                              {pairHeadingDetailItems(section.items)
                                .slice(0, 4)
                                .map((topic, index) => (
                                  <Box
                                    key={`topic-${index}`}
                                    sx={{
                                      p: 1.75,
                                      borderRadius: 2.5,
                                      border: `1px solid ${theme.ll.border}`,
                                      background: alpha(theme.palette.background.paper, 0.4),
                                      animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                                      animationDelay: `${index * 70}ms`,
                                      transition: "border-color .25s ease, transform .25s ease",
                                      "&:hover": {
                                        borderColor: alpha(theme.palette.primary.main, 0.4),
                                        transform: "translateX(4px)",
                                      },
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 700, mb: topic.details ? 0.5 : 0 }}>
                                      {renderLineWithHighlights(topic.heading)}
                                    </Typography>
                                    {topic.details ? (
                                      <Typography
                                        variant="caption"
                                        sx={{ color: "text.secondary", lineHeight: 1.65 }}
                                      >
                                        {renderLineWithHighlights(topic.details)}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                ))}
                            </Stack>
                          ) : (
                            <Stack spacing={1.25}>
                              {section.items.map((item, index) => (
                                <Stack key={`${section.title}-${index}`} direction="row" spacing={1.25} sx={{ alignItems: "flex-start", animation: "ll-fade-up .5s cubic-bezier(.22,1,.36,1) both",
                                    animationDelay: `${index * 55}ms`, }}>
                                  <Box
                                    sx={{
                                      width: 6,
                                      height: 6,
                                      mt: "8px",
                                      borderRadius: "50%",
                                      flexShrink: 0,
                                      bgcolor: "primary.main",
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", lineHeight: 1.75 }}
                                  >
                                    {renderLineWithHighlights(item)}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          )}
                        </Box>

                        {/* Deep-dive unlocks */}
                        {isTopicBreakdown && currentUser && currentReportId ? (
                          <UnlockAction
                            unlocked={Boolean(unlockedDetails?.topicBreakdown)}
                            onClick={() => onUnlockRedirect("topics")}
                            unlockedLabel="Open complete topic analysis"
                            lockedLabel="Unlock complete topic analysis (-1 credit)"
                          />
                        ) : null}

                        {isWeakness && currentUser && currentReportId ? (
                          <UnlockAction
                            unlocked={Boolean(unlockedDetails?.weaknessAnalysis)}
                            onClick={() => onUnlockRedirect("weaknesses")}
                            unlockedLabel="Open weakness analysis"
                            lockedLabel="Deep weakness analysis (-1 credit)"
                          />
                        ) : null}

                        {isPlan && currentUser && currentReportId ? (
                          <Box sx={{ mt: 3 }}>
                            <Divider sx={{ mb: 2.5 }} />
                            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                              Detailed 6-month roadmap
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Plan the next six months day by day. Unlocking each month costs 1 credit.
                            </Typography>

                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "repeat(3, 1fr)",
                                  sm: "repeat(6, 1fr)",
                                },
                                gap: 1,
                                mb: 2.5,
                              }}
                            >
                              {[1, 2, 3, 4, 5, 6].map((m) => {
                                const isUnlocked = Boolean(unlockedDetails?.sixMonthPlan?.[`month${m}`]);
                                const isActive = activeMonthTab === m;
                                const accent = isUnlocked
                                  ? theme.palette.success.main
                                  : theme.palette.text.disabled;

                                return (
                                  <Box
                                    key={`tab-month-${m}`}
                                    onClick={() => onChangeMonthTab(m)}
                                    sx={{
                                      py: 1.25,
                                      textAlign: "center",
                                      cursor: "pointer",
                                      borderRadius: 2.5,
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      userSelect: "none",
                                      color: isActive ? "primary.main" : "text.secondary",
                                      border: `1px solid ${
                                        isActive
                                          ? alpha(theme.palette.primary.main, 0.5)
                                          : theme.ll.border
                                      }`,
                                      background: isActive
                                        ? alpha(theme.palette.primary.main, 0.13)
                                        : alpha(theme.palette.background.paper, 0.35),
                                      transition:
                                        "transform .25s cubic-bezier(.22,1,.36,1), background-color .25s ease",
                                      "&:hover": { transform: "translateY(-2px)" },
                                      "&:active": { transform: "scale(0.96)" },
                                    }}
                                  >
                                    <Box>Month {m}</Box>
                                    {isUnlocked ? (
                                      <CheckCircleRoundedIcon sx={{ fontSize: 14, color: accent, mt: 0.25 }} />
                                    ) : (
                                      <LockRoundedIcon sx={{ fontSize: 13, color: accent, mt: 0.25 }} />
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>

                            {(() => {
                              const isUnlocked = Boolean(
                                unlockedDetails?.sixMonthPlan?.[`month${activeMonthTab}`],
                              );
                              return (
                                <Box
                                  sx={{
                                    p: 2.5,
                                    textAlign: "center",
                                    borderRadius: 3,
                                    border: `1px dashed ${theme.ll.borderStrong}`,
                                    background: alpha(theme.palette.background.paper, 0.3),
                                  }}
                                >
                                  {!isUnlocked ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                      Month {activeMonthTab} curriculum is locked.
                                    </Typography>
                                  ) : null}
                                  <UnlockAction
                                    unlocked={isUnlocked}
                                    fullWidth={false}
                                    onClick={() => onUnlockRedirect("roadmap", activeMonthTab)}
                                    unlockedLabel={`Open month ${activeMonthTab} curriculum`}
                                    lockedLabel={`Unlock month ${activeMonthTab} (-1 credit)`}
                                  />
                                </Box>
                              );
                            })()}
                          </Box>
                        ) : null}
                      </GlassCard>
                    </Reveal>
                  );
                })}
              </Stack>
            </Fade>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
