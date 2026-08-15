import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";

import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import {
  AnimatedNumber,
  GlassCard,
  PulseButton,
  Reveal,
  ScoreGauge,
  SectionHeading,
  useInView,
} from "./ui";
import { getHeatLevel, getMonthTicks, getTopicColor, heatCellColor } from "../utils/report";

/** A single topic row whose bar fills in when it scrolls into view. */
function TopicBar({ topic, index }) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const color = getTopicColor(index);
  const pct = Math.min(topic.percentage, 100);

  return (
    <Box ref={ref} sx={{ mb: 1.75 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 0.6 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {topic.name}
        </Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 700, flexShrink: 0, ml: 1 }}>
          {topic.solved} ({topic.percentage.toFixed(1)}%)
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.07),
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: inView ? `${pct}%` : 0,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${alpha(color, 0.65)}, ${color})`,
            boxShadow: `0 0 12px ${alpha(color, 0.5)}`,
            transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${index * 70}ms`,
          }}
        />
      </Box>
    </Box>
  );
}

/** GitHub-style contribution grid; scrolls horizontally on narrow screens. */
function ActivityHeatmap({ heatmapData, maxHeatCount }) {
  const theme = useTheme();
  const monthTicks = getMonthTicks(heatmapData);
  const [ref, inView] = useInView({ threshold: 0.1 });

  // LeetCode does not expose a daily calendar for every profile.
  if (heatmapData.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: "center",
          borderRadius: 3,
          border: (t) => `1px dashed ${t.ll.borderStrong}`,
          background: alpha(theme.palette.background.paper, 0.3),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Daily submission calendar isn't available for this profile.
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={ref}>
      <Box sx={{ overflowX: "auto", pb: 1, mx: { xs: -0.5, sm: 0 }, px: { xs: 0.5, sm: 0 } }}>
        <Box sx={{ minWidth: { xs: 720, md: "100%" } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateRows: "repeat(7, 1fr)",
              gridAutoFlow: "column",
              gap: "3px",
            }}
          >
            {heatmapData.map((point, index) => {
              const level = getHeatLevel(point.count, maxHeatCount);
              return (
                <Tooltip
                  key={`heat-${point.date}`}
                  title={`${point.date}: ${point.count} submission${point.count === 1 ? "" : "s"}`}
                  disableInteractive
                >
                  <Box
                    sx={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      minWidth: 9,
                      borderRadius: "2.5px",
                      bgcolor: heatCellColor(level, theme),
                      opacity: inView ? 1 : 0,
                      transform: inView ? "scale(1)" : "scale(0.4)",
                      transition: `opacity .4s ease ${Math.min(index * 1.1, 700)}ms, transform .4s cubic-bezier(.22,1,.36,1) ${Math.min(index * 1.1, 700)}ms, filter .18s ease`,
                      "&:hover": {
                        filter: "brightness(1.5)",
                        outline: `1px solid ${theme.palette.primary.main}`,
                      },
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          <Box sx={{ position: "relative", height: 18, mt: 0.75 }}>
            {monthTicks.map((tick) => (
              <Typography
                key={`tick-${tick.month}-${tick.index}`}
                variant="caption"
                sx={{
                  position: "absolute",
                  left: `${(tick.index / Math.max(heatmapData.length - 1, 1)) * 100}%`,
                  color: "text.disabled",
                  fontSize: "0.65rem",
                }}
              >
                {tick.month}
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "flex-end", mt: 1 }}>
        <Typography variant="caption" color="text.disabled">
          Less
        </Typography>
        {[0, 1, 2, 3, 4].map((level) => (
          <Box
            key={level}
            sx={{
              width: 11,
              height: 11,
              borderRadius: "2.5px",
              bgcolor: heatCellColor(level, theme),
            }}
          />
        ))}
        <Typography variant="caption" color="text.disabled">
          More
        </Typography>
      </Stack>
    </Box>
  );
}

export default function ProfileDashboard({
  analysis,
  showAllTopics,
  onToggleTopics,
  onGenerateReport,
  coachLoading,
}) {
  const theme = useTheme();

  const heatmapData = analysis?.recentActivity?.dailyHeatmap || [];
  const maxHeatCount = heatmapData.reduce((max, point) => Math.max(max, point.count), 0);
  const hasHeatmap = heatmapData.length > 0;
  const activeDays = analysis?.recentActivity?.totalActiveDays || Math.min(365, heatmapData.filter((d) => d.count > 0).length);

  const solvedPct =
    (analysis.totals.solved / Math.max(analysis.totals.questions, 1)) * 100;

  const difficultyCards = [
    { key: "easy", label: "Easy", color: theme.palette.success.main, data: analysis.difficulty.easy },
    { key: "medium", label: "Medium", color: theme.palette.warning.main, data: analysis.difficulty.medium },
    { key: "hard", label: "Hard", color: theme.palette.error.main, data: analysis.difficulty.hard },
  ];

  const topicRows = showAllTopics ? analysis.topics.slice(0, 20) : analysis.topics.slice(0, 8);

  return (
    <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 2, sm: 3 } }}>
      {/* ---------- Top row: solved ring + difficulty ---------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Reveal direction="left">
          <GlassCard sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
            <SectionHeading
              icon={<DonutLargeRoundedIcon />}
              title="Problems solved"
              subtitle={`${analysis.totals.attempting} currently attempting`}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2.5, sm: 3 }} sx={{ alignItems: "center" }}>
              <Box sx={{ position: "relative" }}>
                <ScoreGauge value={solvedPct} size={158} showSuffix label="of pool" />
              </Box>

              <Box sx={{ flex: 1, width: "100%" }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", mb: 2 }}>
                  <Typography sx={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>
                    <AnimatedNumber value={analysis.totals.solved} />
                  </Typography>
                  <Typography variant="h6" color="text.disabled">
                    / {analysis.totals.questions}
                  </Typography>
                </Stack>

                <Stack spacing={1.5}>
                  {difficultyCards.map((item) => {
                    const pct = (item.data.solved / Math.max(item.data.total, 1)) * 100;
                    return (
                      <Box key={item.key}>
                        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2" sx={{ color: item.color, fontWeight: 700 }}>
                            {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.data.solved}
                            <Box component="span" sx={{ color: "text.disabled", fontWeight: 500 }}>
                              /{item.data.total}
                            </Box>
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            height: 7,
                            borderRadius: 999,
                            overflow: "hidden",
                            bgcolor: alpha(item.color, 0.15),
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: 999,
                              bgcolor: item.color,
                              boxShadow: `0 0 10px ${alpha(item.color, 0.55)}`,
                              animation: "ll-fade-in .8s ease both",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          </GlassCard>
        </Reveal>

        <Reveal direction="right" delay={70}>
          <Stack spacing={{ xs: 2, sm: 3 }} sx={{ height: "100%" }}>
            <GlassCard accent={theme.palette.warning.main} sx={{ p: { xs: 2, sm: 2.5 }, flex: 1 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    flexShrink: 0,
                    color: "warning.main",
                    background: alpha(theme.palette.warning.main, 0.13),
                    animation: "ll-float 4.5s ease-in-out infinite",
                  }}
                >
                  <LocalFireDepartmentRoundedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Max streak
                  </Typography>
                  <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.1 }}>
                    <AnimatedNumber value={analysis.recentActivity.streak} />
                    <Box component="span" sx={{ fontSize: "1rem", color: "text.disabled", ml: 0.75 }}>
                      days
                    </Box>
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>

            <GlassCard accent={theme.palette.info.main} sx={{ p: { xs: 2, sm: 2.5 }, flex: 1 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    flexShrink: 0,
                    color: "info.main",
                    background: alpha(theme.palette.info.main, 0.13),
                  }}
                >
                  <CalendarMonthRoundedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Active days (1y)
                  </Typography>
                  <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.1 }}>
                    {hasHeatmap ? <AnimatedNumber value={activeDays} /> : "—"}
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>

            <GlassCard accent={theme.palette.secondary.main} sx={{ p: { xs: 2, sm: 2.5 }, flex: 1 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    flexShrink: 0,
                    color: "secondary.main",
                    background: alpha(theme.palette.secondary.main, 0.13),
                  }}
                >
                  <MilitaryTechRoundedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Badges
                  </Typography>
                  <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.1 }}>
                    0
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Apr LeetCoding Challenge locked
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>
          </Stack>
        </Reveal>
      </Box>

      {/* ---------- Activity heatmap ---------- */}
      <Reveal delay={60}>
        <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
          <SectionHeading
            icon={<CalendarMonthRoundedIcon />}
            accent={theme.palette.success.main}
            title={`${analysis.recentActivity.last30DaysSubmissions} submissions in the last 30 days`}
            subtitle={
              hasHeatmap
                ? `${activeDays} active days · max streak ${analysis.recentActivity.streak}`
                : `Max streak ${analysis.recentActivity.streak} days`
            }
          />
          <ActivityHeatmap heatmapData={heatmapData} maxHeatCount={maxHeatCount} />
        </GlassCard>
      </Reveal>

      {/* ---------- Topic coverage ---------- */}
      <Reveal delay={80}>
        <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
          <SectionHeading
            icon={<CategoryRoundedIcon />}
            accent={theme.palette.info.main}
            title="Topic coverage"
            subtitle="Where your solved problems actually cluster"
            action={
              <Chip label={`${analysis.topics.length} topics`} size="small" variant="outlined" />
            }
          />

          <Box>
            {topicRows.map((topic, index) => (
              <TopicBar key={`graph-${topic.name}`} topic={topic} index={index} />
            ))}
          </Box>

          {analysis.topics.length > 8 ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={onToggleTopics}
              endIcon={
                <ExpandMoreRoundedIcon
                  sx={{
                    transition: "transform .3s cubic-bezier(.22,1,.36,1)",
                    transform: showAllTopics ? "rotate(180deg)" : "none",
                  }}
                />
              }
              sx={{ mt: 1 }}
            >
              {showAllTopics ? "Show less" : `Show all ${Math.min(analysis.topics.length, 20)}`}
            </Button>
          ) : null}
        </GlassCard>
      </Reveal>

      {/* ---------- AI coach CTA ---------- */}
      <Reveal delay={100}>
        <GlassCard
          accent={theme.palette.info.main}
          glow
          interactive={false}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(
              theme.palette.primary.main,
              0.07,
            )})`,
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  borderRadius: 3,
                  color: "info.main",
                  background: alpha(theme.palette.info.main, 0.15),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                  animation: "ll-pulse-glow 3.5s ease-in-out infinite",
                }}
              >
                <PsychologyRoundedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  AI coach evaluation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, lineHeight: 1.7 }}>
                  A hiring-oriented report with your overall skill score, company readiness
                  ratings, weak topics and a preparation plan.
                </Typography>
              </Box>
            </Stack>

            <PulseButton
              size="large"
              onClick={onGenerateReport}
              disabled={coachLoading}
              startIcon={!coachLoading ? <AutoAwesomeRoundedIcon /> : null}
              gradient={theme.ll.gradientPrimary}
              sx={{ flexShrink: 0, width: { xs: "100%", md: "auto" }, minWidth: { md: 240 } }}
            >
              {coachLoading ? (
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <CircularProgress size={18} color="inherit" />
                  <span>Generating…</span>
                </Stack>
              ) : (
                "Generate AI evaluation"
              )}
            </PulseButton>
          </Stack>
        </GlassCard>
      </Reveal>
    </Stack>
  );
}
