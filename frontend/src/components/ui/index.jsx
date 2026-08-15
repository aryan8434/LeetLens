import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import { alpha, styled, useTheme } from "@mui/material/styles";

/* ------------------------------------------------------------------ *
 * Scroll-reveal
 * ------------------------------------------------------------------ */

/**
 * Fires once when the element scrolls into the viewport.
 *
 * The default threshold is 0 on purpose: a ratio-based threshold can never be
 * reached by an element taller than `viewport / threshold` (a long AI report,
 * for example), which would leave revealed content stuck at opacity 0.
 */
export function useInView({ threshold = 0, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  // Without IntersectionObserver support, treat everything as already visible
  // so content is never stuck at opacity 0.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

/**
 * Reveals children with a fade + travel once they enter the viewport.
 * `delay` staggers siblings; `direction` picks the travel axis.
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  distance = 24,
  duration = 620,
  sx,
  ...rest
}) {
  const [ref, inView] = useInView();

  const offset = {
    up: `0, ${distance}px, 0`,
    down: `0, -${distance}px, 0`,
    left: `${distance}px, 0, 0`,
    right: `-${distance}px, 0, 0`,
    none: "0, 0, 0",
  }[direction];

  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translate3d(0,0,0) scale(1)" : `translate3d(${offset}) scale(0.985)`,
        transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: "opacity, transform",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Animated number
 * ------------------------------------------------------------------ */

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

/** True when the OS asks for reduced motion — we then jump straight to values. */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Counts up to `value` with an ease-out ramp whenever the value changes. */
export function AnimatedNumber({
  value = 0,
  duration = 1100,
  decimals = 0,
  prefix = "",
  suffix = "",
  startOnView = true,
  ...rest
}) {
  const [ref, inView] = useInView();
  const [display, setDisplay] = useState(0);
  const [reduced] = useState(prefersReducedMotion);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced || (startOnView && !inView)) return undefined;

    const target = Number(value) || 0;
    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progress);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, inView, startOnView, reduced]);

  // With reduced motion we render the target directly and never animate.
  const shown = reduced ? Number(value) || 0 : display;

  return (
    <Box component="span" ref={ref} {...rest}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/**
 * The app's default surface: frosted glass, a coloured top hairline, and a
 * cursor-follow sheen on hover.
 */
export const GlassCard = styled(Card, {
  shouldForwardProp: (prop) => !["accent", "interactive", "glow"].includes(prop),
})(({ theme, accent, interactive = true, glow = false }) => {
  const accentColor = accent || theme.palette.primary.main;
  return {
    position: "relative",
    overflow: "hidden",
    transition:
      "transform .34s cubic-bezier(.22,1,.36,1), box-shadow .34s ease, border-color .34s ease",
    ...(glow && { boxShadow: `${theme.ll.glow.soft}, 0 0 42px ${alpha(accentColor, 0.16)}` }),

    "&::before": {
      content: '""',
      position: "absolute",
      insetInline: 0,
      top: 0,
      height: 2,
      background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
      opacity: 0.7,
      transition: "opacity .34s ease",
    },

    ...(interactive && {
      "&:hover": {
        transform: "translateY(-5px)",
        borderColor: alpha(accentColor, 0.45),
        boxShadow: `${theme.ll.glow.soft}, 0 0 46px ${alpha(accentColor, 0.2)}`,
      },
      "&:hover::before": { opacity: 1 },
      "@media (hover: none)": {
        "&:hover": { transform: "none" },
        "&:active": { transform: "scale(0.995)" },
      },
    }),
  };
});

/** Small uppercase label + optional accent bar, used above card content. */
export function SectionHeading({ title, subtitle, icon, accent, action, sx }) {
  const theme = useTheme();
  const accentColor = accent || theme.palette.primary.main;

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 2.5, ...sx }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
        {icon ? (
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: "13px",
              color: accentColor,
              background: alpha(accentColor, 0.13),
              border: `1px solid ${alpha(accentColor, 0.3)}`,
              transition: "transform .3s cubic-bezier(.22,1,.36,1)",
              "&:hover": { transform: "rotate(-8deg) scale(1.08)" },
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{ fontSize: { xs: "1.05rem", sm: "1.2rem" }, lineHeight: 1.25 }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.25, fontSize: { xs: "0.8rem", sm: "0.86rem" } }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

/** Compact metric tile with an animated value. */
export function StatTile({ label, value, suffix = "", accent, icon, sub, sx }) {
  const theme = useTheme();
  const accentColor = accent || theme.palette.primary.main;

  return (
    <Box
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        background: alpha(accentColor, 0.08),
        border: `1px solid ${alpha(accentColor, 0.24)}`,
        transition: "transform .3s cubic-bezier(.22,1,.36,1), background-color .3s ease",
        "&:hover": { transform: "translateY(-3px)", background: alpha(accentColor, 0.14) },
        ...sx,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
        {icon ? <Box sx={{ color: accentColor, display: "flex" }}>{icon}</Box> : null}
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontSize: "0.66rem", lineHeight: 1.4 }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: "1.5rem", sm: "1.75rem" },
          color: accentColor,
          lineHeight: 1.1,
        }}
      >
        {typeof value === "number" ? (
          <AnimatedNumber value={value} suffix={suffix} />
        ) : (
          <>
            {value}
            {suffix}
          </>
        )}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Back button + gradient page title + optional right-hand slot. */
export function PageHeader({ title, subtitle, onBack, action, backLabel = "Back", sx }) {
  const theme = useTheme();
  return (
    <Reveal direction="down" distance={16} sx={sx}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: { xs: 2, sm: 3 }, flexWrap: "wrap", rowGap: 1.25 }}>
        {onBack ? (
          <Button
            onClick={onBack}
            startIcon={
              <Box component="span" sx={{ display: "flex", fontSize: 18, lineHeight: 1 }}>
                ←
              </Box>
            }
            sx={{
              flexShrink: 0,
              color: "text.secondary",
              border: `1px solid ${theme.ll.border}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            {backLabel}
          </Button>
        ) : null}

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: "1.35rem", sm: "1.85rem" },
              background: theme.ll.gradientBrand,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "ll-gradient-pan 7s ease infinite",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        {action}
      </Stack>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

/**
 * Primary CTA. On top of MUI's ripple it adds a light sweep on hover and an
 * expanding shockwave ring on every click, so taps feel physical.
 */
export function PulseButton({
  children,
  onClick,
  gradient,
  sx,
  disableShockwave = false,
  ...rest
}) {
  const theme = useTheme();
  const [waves, setWaves] = useState([]);
  const seq = useRef(0);

  const handleClick = useCallback(
    (event) => {
      if (!disableShockwave) {
        const rect = event.currentTarget.getBoundingClientRect();
        const id = (seq.current += 1);
        setWaves((prev) => [
          ...prev,
          { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
        ]);
        setTimeout(() => setWaves((prev) => prev.filter((w) => w.id !== id)), 640);
      }
      onClick?.(event);
    },
    [onClick, disableShockwave],
  );

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      sx={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        ...(gradient && {
          background: gradient,
          backgroundSize: "200% 200%",
          "&:hover": { backgroundPosition: "100% 0" },
        }),
        // Light sweep that crosses the button on hover.
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.32) 50%, transparent 75%)",
          backgroundSize: "220% 100%",
          backgroundPosition: "-120% 0",
          opacity: 0,
          transition: "opacity .2s ease",
          pointerEvents: "none",
        },
        "&:hover::after": { opacity: 1, animation: "ll-shimmer 1.1s ease" },
        "& > *": { position: "relative", zIndex: 1 },
        ...sx,
      }}
      {...rest}
    >
      <Box component="span">{children}</Box>
      {waves.map((wave) => (
        <Box
          key={wave.id}
          component="span"
          sx={{
            position: "absolute",
            left: wave.x,
            top: wave.y,
            width: 26,
            height: 26,
            marginLeft: "-13px",
            marginTop: "-13px",
            borderRadius: "50%",
            border: `2px solid ${alpha(theme.palette.common.white, 0.85)}`,
            animation: "ll-ripple-out .62s cubic-bezier(.22,1,.36,1) forwards",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      ))}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * Score gauge
 * ------------------------------------------------------------------ */

export function scoreColor(score, theme) {
  if (score === null || score === undefined) return theme.palette.text.disabled;
  if (score >= 80) return theme.palette.success.main;
  if (score >= 50) return theme.palette.warning.main;
  return theme.palette.error.main;
}

/**
 * Circular score dial. The arc sweeps in and the number counts up together,
 * with a soft halo that pulses while the value settles.
 */
export function ScoreGauge({
  value = 0,
  max = 100,
  size = 132,
  thickness = 9,
  label,
  color,
  showSuffix = true,
  duration = 1400,
}) {
  const theme = useTheme();
  const [ref, inView] = useInView({ threshold: 0.3 });
  const [progress, setProgress] = useState(0);
  const [reduced] = useState(prefersReducedMotion);

  const safeValue = Math.max(0, Math.min(Number(value) || 0, max));
  const ratio = max > 0 ? safeValue / max : 0;
  const stroke = color || scoreColor((safeValue / max) * 100, theme);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!inView || reduced) return undefined;
    // Defer a frame so the arc animates from 0 instead of snapping into place.
    const id = requestAnimationFrame(() => setProgress(ratio));
    return () => cancelAnimationFrame(id);
  }, [inView, ratio, reduced]);

  const shownProgress = reduced ? ratio : progress;

  return (
    <Box
      ref={ref}
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* Halo */}
      <Box
        sx={{
          position: "absolute",
          inset: "12%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(stroke, 0.3)} 0%, transparent 68%)`,
          animation: "ll-pulse-glow 3.4s ease-in-out infinite",
        }}
      />

      <Box
        component="svg"
        viewBox={`0 0 ${size} ${size}`}
        sx={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={alpha(theme.palette.text.primary, 0.09)}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shownProgress)}
          style={{
            transition: `stroke-dashoffset ${duration}ms cubic-bezier(.22,1,.36,1)`,
            filter: `drop-shadow(0 0 7px ${alpha(stroke, 0.6)})`,
          }}
        />
      </Box>

      <Box sx={{ position: "relative", textAlign: "center", lineHeight: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: size / 4.2,
            color: stroke,
            lineHeight: 1.05,
          }}
        >
          <AnimatedNumber value={safeValue} duration={duration} />
          {showSuffix ? (
            <Box component="span" sx={{ fontSize: size / 9, opacity: 0.65 }}>
              %
            </Box>
          ) : null}
        </Typography>
        {label ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              fontSize: size / 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ *
 * Brand
 * ------------------------------------------------------------------ */

export function BrandMark({ size = 34, showWordmark = true, onClick, sx }) {
  return (
    <Stack direction="row" spacing={1.1} onClick={onClick} sx={{ alignItems: "center", cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "transform .3s cubic-bezier(.22,1,.36,1)",
        "&:hover": onClick ? { transform: "scale(1.035)" } : undefined,
        "&:hover img": { transform: "rotate(-10deg)" },
        ...sx, }}>
      <Box
        component="img"
        src="/logo.png"
        alt="LeetLens"
        sx={{
          width: size,
          height: size,
          objectFit: "contain",
          transition: "transform .45s cubic-bezier(.22,1,.36,1)",
          filter: "drop-shadow(0 3px 10px rgba(255,106,0,0.32))",
        }}
      />
      {showWordmark ? (
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            fontSize: size * 0.62,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <Box component="span" sx={{ color: "#ff6a00" }}>
            Leet
          </Box>
          <Box component="span" sx={{ color: "primary.main" }}>
            Lens
          </Box>
        </Typography>
      ) : null}
    </Stack>
  );
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

/** Indeterminate bar with a travelling highlight — used during long AI calls. */
export function ScanBar({ height = 6, sx }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 999,
        overflow: "hidden",
        background: alpha(theme.palette.primary.main, 0.12),
        ...sx,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          height: "100%",
          width: "45%",
          borderRadius: 999,
          background: theme.ll.gradientPrimary,
          animation: "ll-bar-slide 1.5s cubic-bezier(.55,.1,.45,.9) infinite",
        }}
      />
    </Box>
  );
}

/** Cycles through status lines so long waits feel like progress. */
export function RotatingStatus({ messages = [], interval = 2200, sx }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(id);
  }, [messages.length, interval]);

  return (
    <Box sx={{ minHeight: 24, ...sx }}>
      {messages.map((message, i) => (
        <Collapse key={message} in={i === index} timeout={400} unmountOnExit>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            {message}
          </Typography>
        </Collapse>
      ))}
    </Box>
  );
}

/** Three-dot "thinking" indicator. */
export function TypingDots({ color, size = 7, sx }) {
  const theme = useTheme();
  const dotColor = color || theme.palette.primary.main;
  return (
    <Stack direction="row" spacing={0.7} sx={{ alignItems: "center", ...(sx) }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: dotColor,
            animation: "ll-bounce-sm 1s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Stack>
  );
}

/** Page-level empty state. */
export function EmptyState({ icon, title, description, action, sx }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: { xs: 5, sm: 7 },
        px: 2,
        borderRadius: 4,
        border: (theme) => `1px dashed ${theme.ll.borderStrong}`,
        background: (theme) => alpha(theme.palette.background.paper, 0.35),
        ...sx,
      }}
    >
      {icon ? (
        <Box
          sx={{
            fontSize: 44,
            mb: 1.5,
            color: "text.disabled",
            display: "flex",
            justifyContent: "center",
            animation: "ll-float 4.5s ease-in-out infinite",
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Typography variant="h6" sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 460, mx: "auto" }}
        >
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2.5 }}>{action}</Box> : null}
    </Box>
  );
}
