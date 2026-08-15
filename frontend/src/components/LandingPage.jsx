import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

import { GlassCard, PulseButton, Reveal } from "./ui";

const FEATURES = [
  {
    icon: <BarChartRoundedIcon />,
    title: "Candidate analytics",
    body: "Solved counts, streaks, difficulty split and topic coverage — every metric a recruiter would scan, in one view.",
    accentKey: "primary",
  },
  {
    icon: <PsychologyRoundedIcon />,
    title: "AI evaluation report",
    body: "An overall skill score, company-wise interview readiness ratings and a day-by-day preparation curriculum.",
    accentKey: "info",
  },
  {
    icon: <DescriptionRoundedIcon />,
    title: "Resume & JD matcher",
    body: "Upload a PDF, paste a job description, and get a recruiter-grade ATS score with concrete rewrites.",
    accentKey: "secondary",
  },
  {
    icon: <TimelineRoundedIcon />,
    title: "6-month roadmap",
    body: "Unlock month-by-month curricula built from your actual weak topics, not a generic sheet.",
    accentKey: "success",
  },
  {
    icon: <WorkspacePremiumRoundedIcon />,
    title: "FAANG readiness",
    body: "See how you'd score against product-based and service-based hiring bars before you apply.",
    accentKey: "warning",
  },
  {
    icon: <LockRoundedIcon />,
    title: "Secure & cached",
    body: "Reuse saved evaluations for free, manage your credit balance, and keep every report in your history.",
    accentKey: "info",
  },
];

const STATS = [
  { value: "15+", label: "Metrics tracked" },
  { value: "6", label: "Month roadmap" },
  { value: "3", label: "Free weekly credits" },
];

export default function LandingPage({ onAnalyzeClick, onResumeClick }) {
  const theme = useTheme();

  return (
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 8 }}>
      {/* ---------------- Hero ---------------- */}
      <Box
        sx={{
          position: "relative",
          textAlign: "center",
          pt: { xs: 5, sm: 9 },
          pb: { xs: 5, sm: 8 },
        }}
      >
        {/* Glow behind the headline */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: 20, sm: 0 },
            left: "50%",
            transform: "translateX(-50%)",
            width: { xs: 320, sm: 620 },
            height: { xs: 320, sm: 520 },
            borderRadius: "50%",
            pointerEvents: "none",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 65%)`,
            animation: "ll-pulse-glow 6s ease-in-out infinite",
          }}
        />

        <Reveal direction="down" distance={14}>
          <Chip
            icon={<AutoAwesomeRoundedIcon />}
            label="AI-powered interview analytics"
            sx={{
              mb: 3,
              px: 0.75,
              fontWeight: 700,
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              "& .MuiChip-icon": { color: "primary.main" },
            }}
          />
        </Reveal>

        <Reveal delay={90}>
          <Typography
            variant="h1"
            sx={{
              position: "relative",
              fontSize: { xs: "2.3rem", sm: "3.4rem", md: "4.1rem" },
              lineHeight: 1.08,
              mb: 2,
            }}
          >
            Know exactly where you
            <br />
            stand before you{" "}
            <Box
              component="span"
              sx={{
                background: theme.ll.gradientBrand,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "ll-gradient-pan 6s ease infinite",
              }}
            >
              interview
            </Box>
          </Typography>
        </Reveal>

        <Reveal delay={170}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 640,
              mx: "auto",
              fontSize: { xs: "0.98rem", sm: "1.1rem" },
              lineHeight: 1.75,
              mb: 4,
            }}
          >
            LeetLens reads your LeetCode profile and your resume, then tells you what a hiring
            panel would see — readiness scores, weak topics, and a plan to fix them.
          </Typography>
        </Reveal>

        <Reveal delay={240}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.75} sx={{ justifyContent: "center", mb: 5 }}>
            <PulseButton
              size="large"
              onClick={onAnalyzeClick}
              endIcon={<ArrowForwardRoundedIcon />}
              gradient={theme.ll.gradientPrimary}
              sx={{ minWidth: { sm: 220 } }}
            >
              Analyze my profile
            </PulseButton>
            <PulseButton
              size="large"
              variant="outlined"
              onClick={onResumeClick}
              startIcon={<DescriptionRoundedIcon />}
              disableShockwave
              sx={{
                minWidth: { sm: 220 },
                color: "text.primary",
                background: "transparent",
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              }}
            >
              Score my resume
            </PulseButton>
          </Stack>
        </Reveal>

        {/* Quick stats strip */}
        <Reveal delay={310}>
          <Stack direction="row" spacing={{ xs: 1.5, sm: 4 }} divider={
              <Box
                sx={{
                  width: "1px",
                  alignSelf: "stretch",
                  bgcolor: theme.ll.border,
                }}
              />
            } sx={{ justifyContent: "center" }}>
            {STATS.map((stat) => (
              <Box key={stat.label} sx={{ px: { xs: 1, sm: 2 } }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.5rem", sm: "2rem" },
                    color: "primary.main",
                    lineHeight: 1.15,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.68rem", sm: "0.78rem" } }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Reveal>
      </Box>

      {/* ---------------- Features ---------------- */}
      <Reveal>
        <Stack spacing={1} sx={{ alignItems: "center", mb: 4 }}>
          <Typography variant="overline" color="primary.main">
            Platform highlights
          </Typography>
          <Typography
            variant="h4"
            sx={{ textAlign: "center", fontSize: { xs: "1.6rem", sm: "2.1rem" } }}
          >
            Everything you need to close the gap
          </Typography>
        </Stack>
      </Reveal>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {FEATURES.map((feature, index) => {
          const accent = theme.palette[feature.accentKey].main;
          return (
            <Reveal key={feature.title} delay={index * 70}>
              <GlassCard accent={accent} sx={{ p: { xs: 2.25, sm: 3 }, height: "100%" }}>
                <Box
                  sx={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 48,
                    height: 48,
                    mb: 2,
                    borderRadius: 3,
                    color: accent,
                    background: alpha(accent, 0.13),
                    border: `1px solid ${alpha(accent, 0.28)}`,
                    transition: "transform .35s cubic-bezier(.22,1,.36,1)",
                    ".MuiCard-root:hover &": { transform: "rotate(-8deg) scale(1.1)" },
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontSize: "1.08rem" }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  {feature.body}
                </Typography>
              </GlassCard>
            </Reveal>
          );
        })}
      </Box>

      {/* ---------------- Closing CTA ---------------- */}
      <Reveal delay={120}>
        <GlassCard
          interactive={false}
          glow
          sx={{
            mt: { xs: 5, sm: 8 },
            p: { xs: 3, sm: 5 },
            textAlign: "center",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(
              theme.palette.info.main,
              0.08,
            )})`,
          }}
        >
          <Typography variant="h4" sx={{ mb: 1.5, fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Your first evaluation is on us
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 520, mx: "auto", mb: 3.5, lineHeight: 1.75 }}
          >
            Create an account and claim 3 free credits every week. No card required to start.
          </Typography>
          <PulseButton
            size="large"
            onClick={onAnalyzeClick}
            endIcon={<ArrowForwardRoundedIcon />}
            gradient={theme.ll.gradientBrand}
            sx={{ minWidth: 240 }}
          >
            Get started free
          </PulseButton>
        </GlassCard>
      </Reveal>
    </Box>
  );
}
