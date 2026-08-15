import { createTheme, alpha } from "@mui/material/styles";

/**
 * LeetLens design tokens.
 * Brand marks: "Leet" = amber/orange, "Lens" = cyan. Purple is the tertiary accent
 * used for AI / premium surfaces.
 */
export const BRAND = {
  orange: "#ff6a00",
  cyan: "#38bdf8",
  purple: "#a78bfa",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

const FONT_STACK =
  '"Montserrat", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

const darkTokens = {
  bgDefault: "#080b14",
  bgElevated: "#0f1524",
  paper: "rgba(19, 26, 43, 0.72)",
  paperSolid: "#131a2b",
  paperHover: "rgba(28, 37, 59, 0.85)",
  border: "rgba(255, 255, 255, 0.09)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  textPrimary: "#f1f5f9",
  textSecondary: "#b6c2d4",
  textMuted: "#7d8ba3",
  primary: BRAND.cyan,
  secondary: BRAND.orange,
  tertiary: BRAND.purple,
  inputBg: "rgba(8, 12, 22, 0.6)",
  auroraA: "rgba(56, 189, 248, 0.16)",
  auroraB: "rgba(167, 139, 250, 0.14)",
  auroraC: "rgba(255, 106, 0, 0.10)",
  scrim: "rgba(3, 6, 14, 0.72)",
};

const lightTokens = {
  bgDefault: "#eef2f9",
  bgElevated: "#ffffff",
  paper: "rgba(255, 255, 255, 0.82)",
  paperSolid: "#ffffff",
  paperHover: "rgba(255, 255, 255, 0.96)",
  border: "rgba(15, 23, 42, 0.10)",
  borderStrong: "rgba(15, 23, 42, 0.18)",
  textPrimary: "#0b1120",
  textSecondary: "#3d4a63",
  textMuted: "#64748b",
  primary: "#0284c7",
  secondary: "#ea580c",
  tertiary: "#7c3aed",
  inputBg: "rgba(255, 255, 255, 0.9)",
  auroraA: "rgba(2, 132, 199, 0.14)",
  auroraB: "rgba(124, 58, 237, 0.10)",
  auroraC: "rgba(234, 88, 12, 0.08)",
  scrim: "rgba(15, 23, 42, 0.45)",
};

/** Global keyframes injected once via CssBaseline so any sx block can use them. */
const GLOBAL_KEYFRAMES = `
  @keyframes ll-fade-up {
    from { opacity: 0; transform: translate3d(0, 22px, 0); }
    to   { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  @keyframes ll-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes ll-pop-in {
    0%   { opacity: 0; transform: scale(0.9); }
    60%  { opacity: 1; transform: scale(1.03); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ll-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-9px); }
  }
  @keyframes ll-pulse-glow {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.06); }
  }
  @keyframes ll-shimmer {
    0%   { background-position: -220% 0; }
    100% { background-position: 220% 0; }
  }
  @keyframes ll-gradient-pan {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes ll-aurora {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    33%  { transform: translate3d(4%, -3%, 0) scale(1.12); }
    66%  { transform: translate3d(-3%, 4%, 0) scale(0.95); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes ll-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes ll-ripple-out {
    0%   { transform: scale(0.8); opacity: 0.55; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes ll-bar-slide {
    0%   { left: -45%; }
    100% { left: 100%; }
  }
  @keyframes ll-bounce-sm {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-5px); }
  }
`;

export function createAppTheme(mode = "dark") {
  const isDark = mode === "dark";
  const t = isDark ? darkTokens : lightTokens;

  const gradientPrimary = `linear-gradient(135deg, ${t.primary} 0%, ${t.tertiary} 100%)`;
  const gradientBrand = `linear-gradient(135deg, ${BRAND.orange} 0%, ${t.primary} 55%, ${t.tertiary} 100%)`;

  const theme = createTheme({
    cssVariables: false,
    palette: {
      mode,
      primary: { main: t.primary, contrastText: isDark ? "#04121c" : "#ffffff" },
      secondary: { main: t.secondary, contrastText: "#ffffff" },
      success: { main: BRAND.green },
      warning: { main: BRAND.amber },
      error: { main: BRAND.red },
      info: { main: t.tertiary },
      background: { default: t.bgDefault, paper: t.paperSolid },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
        disabled: t.textMuted,
      },
      divider: t.border,
    },

    shape: { borderRadius: 14 },

    typography: {
      fontFamily: FONT_STACK,
      h1: { fontWeight: 800, letterSpacing: "-0.02em" },
      h2: { fontWeight: 800, letterSpacing: "-0.02em" },
      h3: { fontWeight: 800, letterSpacing: "-0.015em" },
      h4: { fontWeight: 800, letterSpacing: "-0.01em" },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 700, textTransform: "none", letterSpacing: 0 },
      overline: { fontWeight: 800, letterSpacing: "0.12em" },
    },

    transitions: {
      easing: {
        // A springy ease used for hover / press feedback across the app.
        easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },

    /** Non-MUI extras consumed by components via `theme.ll`. */
    ll: {
      ...t,
      gradientPrimary,
      gradientBrand,
      gradientWarm: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.amber} 100%)`,
      glass: {
        background: t.paper,
        backdropFilter: "blur(18px) saturate(140%)",
        border: `1px solid ${t.border}`,
      },
      glow: {
        primary: `0 0 0 1px ${alpha(t.primary, 0.25)}, 0 14px 40px ${alpha(t.primary, isDark ? 0.22 : 0.18)}`,
        purple: `0 0 0 1px ${alpha(t.tertiary, 0.25)}, 0 14px 40px ${alpha(t.tertiary, isDark ? 0.22 : 0.16)}`,
        soft: isDark
          ? "0 18px 44px rgba(0, 0, 0, 0.45)"
          : "0 18px 44px rgba(15, 23, 42, 0.10)",
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: `
          ${GLOBAL_KEYFRAMES}

          html {
            scrollbar-gutter: stable;
            -webkit-text-size-adjust: 100%;
          }

          body {
            background-color: ${t.bgDefault};
            font-family: ${FONT_STACK};
            overflow-x: hidden;
            min-height: 100vh;
            min-height: 100dvh;
          }

          /* Animated aurora field painted behind the whole app. */
          body::before {
            content: "";
            position: fixed;
            inset: -25%;
            z-index: -2;
            pointer-events: none;
            background:
              radial-gradient(38% 42% at 18% 22%, ${t.auroraA} 0%, transparent 62%),
              radial-gradient(34% 40% at 82% 16%, ${t.auroraB} 0%, transparent 60%),
              radial-gradient(44% 46% at 62% 88%, ${t.auroraC} 0%, transparent 64%);
            animation: ll-aurora 26s ease-in-out infinite;
          }

          body::after {
            content: "";
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            opacity: ${isDark ? 0.5 : 0.28};
            background-image: linear-gradient(${t.border} 1px, transparent 1px),
                              linear-gradient(90deg, ${t.border} 1px, transparent 1px);
            background-size: 64px 64px;
            mask-image: radial-gradient(circle at 50% 0%, #000 0%, transparent 72%);
            -webkit-mask-image: radial-gradient(circle at 50% 0%, #000 0%, transparent 72%);
          }

          *::-webkit-scrollbar { width: 10px; height: 10px; }
          *::-webkit-scrollbar-track { background: transparent; }
          *::-webkit-scrollbar-thumb {
            background: ${alpha(t.primary, 0.45)};
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          *::-webkit-scrollbar-thumb:hover { background: ${alpha(t.primary, 0.7)}; background-clip: content-box; }

          ::selection { background: ${alpha(t.primary, 0.32)}; }

          /* Respect users who ask for reduced motion. */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.001ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.001ms !important;
              scroll-behavior: auto !important;
            }
          }
        `,
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 700,
            paddingInline: 20,
            position: "relative",
            overflow: "hidden",
            transition:
              "transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, background-color .2s ease, border-color .2s ease",
            "&:hover": { transform: "translateY(-2px)" },
            // Tactile "press" feedback on click, on top of MUI's ripple.
            "&:active": { transform: "translateY(0) scale(0.97)" },
            "&.Mui-disabled": { transform: "none" },
            "@media (hover: none)": {
              "&:hover": { transform: "none" },
            },
          },
          sizeLarge: { paddingBlock: 12, fontSize: "1rem" },
          containedPrimary: {
            background: gradientPrimary,
            backgroundSize: "180% 180%",
            color: isDark ? "#04121c" : "#ffffff",
            boxShadow: `0 8px 24px ${alpha(t.primary, 0.34)}`,
            "&:hover": {
              backgroundPosition: "100% 0",
              boxShadow: `0 14px 34px ${alpha(t.primary, 0.46)}`,
              transform: "translateY(-2px)",
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.amber})`,
            color: "#1a0e00",
            boxShadow: `0 8px 24px ${alpha(BRAND.orange, 0.34)}`,
            "&:hover": { boxShadow: `0 14px 34px ${alpha(BRAND.orange, 0.46)}` },
          },
          outlined: {
            borderColor: t.borderStrong,
            backdropFilter: "blur(8px)",
            "&:hover": {
              borderColor: t.primary,
              backgroundColor: alpha(t.primary, 0.08),
            },
          },
          text: {
            "&:hover": { backgroundColor: alpha(t.primary, 0.08) },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            transition:
              "transform .22s cubic-bezier(.22,1,.36,1), background-color .2s ease, color .2s ease",
            "&:hover": { transform: "translateY(-1px) scale(1.06)" },
            "&:active": { transform: "scale(0.92)" },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          rounded: { borderRadius: 18 },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 20,
            background: t.paper,
            backdropFilter: "blur(18px) saturate(140%)",
            border: `1px solid ${t.border}`,
            boxShadow: isDark
              ? "0 18px 44px rgba(0, 0, 0, 0.38)"
              : "0 18px 44px rgba(15, 23, 42, 0.08)",
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: t.inputBg,
            transition: "box-shadow .2s ease, background-color .2s ease",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.border },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(t.primary, 0.5),
            },
            "&.Mui-focused": { boxShadow: `0 0 0 4px ${alpha(t.primary, 0.16)}` },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.primary,
              borderWidth: 1.5,
            },
          },
          input: {
            // Keep >=16px on phones so iOS Safari never zooms on focus.
            "@media (max-width:600px)": { fontSize: 16 },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 700, borderRadius: 999 },
          outlined: { borderColor: t.borderStrong },
        },
      },

      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            background: isDark ? "rgba(10, 15, 28, 0.96)" : "rgba(15, 23, 42, 0.94)",
            border: `1px solid ${t.border}`,
            fontSize: "0.78rem",
            fontWeight: 600,
            borderRadius: 8,
            padding: "7px 11px",
          },
          arrow: { color: isDark ? "rgba(10, 15, 28, 0.96)" : "rgba(15, 23, 42, 0.94)" },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 22,
            background: isDark ? "rgba(13, 19, 33, 0.94)" : "rgba(255, 255, 255, 0.97)",
            backdropFilter: "blur(24px) saturate(150%)",
            border: `1px solid ${t.border}`,
            backgroundImage: "none",
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            background: isDark ? "rgba(11, 16, 29, 0.97)" : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(22px) saturate(150%)",
            borderRight: `1px solid ${t.border}`,
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            marginTop: 8,
            minWidth: 232,
            background: isDark ? "rgba(13, 19, 33, 0.97)" : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px) saturate(150%)",
            border: `1px solid ${t.border}`,
            boxShadow: isDark
              ? "0 22px 54px rgba(0,0,0,0.55)"
              : "0 22px 54px rgba(15,23,42,0.14)",
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: "3px 7px",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "background-color .18s ease, transform .18s ease",
            "&:hover": {
              backgroundColor: alpha(t.primary, 0.12),
              transform: "translateX(3px)",
            },
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: "background-color .18s ease, transform .18s ease",
            "&:hover": { backgroundColor: alpha(t.primary, 0.1) },
            "&:active": { transform: "scale(0.985)" },
            "&.Mui-selected": {
              backgroundColor: alpha(t.primary, 0.16),
              "&:hover": { backgroundColor: alpha(t.primary, 0.22) },
            },
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            minHeight: 46,
            borderRadius: 10,
            transition: "color .2s ease, background-color .2s ease",
            "&:hover": { backgroundColor: alpha(t.primary, 0.07) },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 3,
            background: gradientPrimary,
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 8, backgroundColor: alpha(t.primary, 0.12) },
          bar: { borderRadius: 999 },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 14, fontWeight: 600, alignItems: "center" },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 800 },
        },
      },

      MuiBackdrop: {
        styleOverrides: {
          root: { backgroundColor: t.scrim, backdropFilter: "blur(6px)" },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.border },
          head: {
            fontWeight: 800,
            fontSize: "0.76rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: t.textMuted,
          },
        },
      },
    },
  });

  return theme;
}

export default createAppTheme;
