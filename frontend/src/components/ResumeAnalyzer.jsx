import { useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import Grow from "@mui/material/Grow";
import Zoom from "@mui/material/Zoom";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";

import { useAuth } from "../contexts/AuthContext";
import {
  GlassCard,
  PulseButton,
  Reveal,
  ScanBar,
  ScoreGauge,
  RotatingStatus,
  SectionHeading,
  TypingDots,
  scoreColor,
} from "./ui";

/* ================================================================== *
 * Parsing helpers (unchanged behaviour — these feed the backend contract)
 * ================================================================== */

// Experience level checker
export function evaluateExperience(text) {
  const lowerText = text.toLowerCase();

  // 1. Direct regex for numeric values before "years/yrs"
  const expRegex = /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b/gi;
  let match;
  while ((match = expRegex.exec(lowerText)) !== null) {
    const years = parseFloat(match[1]);
    if (years > 1) {
      return {
        violated: true,
        reason: `Detected direct mention of "${match[0]}" of experience.`,
      };
    }
  }

  // 2. Direct regex for word numbers before "years/yrs"
  const textNumbers = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  for (let i = 0; i < textNumbers.length; i++) {
    const word = textNumbers[i];
    const wordRegex = new RegExp(`\\b${word}\\+?\\s*(?:years?|yrs?)\\b`, "i");
    const m = wordRegex.exec(lowerText);
    if (m) {
      return {
        violated: true,
        reason: `Detected "${m[0]}" of experience.`,
      };
    }
  }

  // 3. Date ranges of work experience (e.g. 2021-2025)
  const dateRangeRegex = /\b(20\d{2})\s*[-–—to]+\s*(20\d{2}|present)\b/gi;
  let dateMatch;
  const currentYear = 2026;
  while ((dateMatch = dateRangeRegex.exec(lowerText)) !== null) {
    const startYear = parseInt(dateMatch[1], 10);
    const endYear =
      dateMatch[2].toLowerCase() === "present" ? currentYear : parseInt(dateMatch[2], 10);
    const diff = endYear - startYear;

    if (diff > 1) {
      // Inspect surrounding context to differentiate work from education/university
      const startIdx = Math.max(0, dateMatch.index - 100);
      const endIdx = Math.min(lowerText.length, dateMatch.index + dateMatch[0].length + 100);
      const context = lowerText.substring(startIdx, endIdx);

      const isEducation =
        /\b(education|university|college|school|degree|b\.?tech|m\.?tech|bachelor|master|phd|gpa|courses?|academic)\b/i.test(
          context,
        );

      if (!isEducation) {
        const isWork =
          /\b(work|experience|job|intern|engineer|developer|analyst|programmer|coder|employment|position|role|officer|manager|lead|architect|consultant)\b/i.test(
            context,
          );
        if (isWork) {
          return {
            violated: true,
            reason: `Detected employment period ${dateMatch[0]} (${diff} years).`,
          };
        }
      }
    }
  }

  return { violated: false };
}

// Helper to extract ATS score from Markdown
function extractScore(reportText) {
  if (!reportText) return null;
  const patterns = [
    /(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)\s*\/\s*100/i,
    /(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)\s*%/i,
    /(\d+)\s*%\s*(?:Match|ATS|Overall)?\s*Score/i,
    /(\d+)\s*\/\s*100\s*(?:Match|ATS|Overall)?\s*Score/i,
    /\b(\d+)\s*\/\s*100\b/,
    /\b(\d+)\s*%\b/,
  ];
  for (const pattern of patterns) {
    const match = reportText.match(pattern);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 0 && val <= 100) return val;
    }
  }
  return null;
}

// Helper to parse simple bold markdown **text** or *text*
function parseInlineMarkdown(text) {
  let clean = (text || "").toString();
  // Fix mismatched asterisks like *Executive Summary**
  if (clean.startsWith("*") && !clean.startsWith("**") && clean.endsWith("**")) {
    clean = "*" + clean;
  }
  const parts = [];
  const regex = /(?:\*\*|__|\*)([^*_]+)(?:\*\*|__|\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      parts.push(clean.substring(lastIndex, match.index));
    }
    parts.push(
      <Box
        key={match.index}
        component="strong"
        sx={{
          color: "text.primary",
          fontWeight: 800,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          px: 0.6,
          py: "1px",
          borderRadius: 1,
        }}
      >
        {match[1].trim()}
      </Box>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < clean.length) {
    parts.push(clean.substring(lastIndex));
  }

  return parts.length > 0 ? parts : clean;
}

const listSx = {
  m: "0.5rem 0 1rem 0",
  pl: 3,
  color: "text.secondary",
  "& li": { mb: "6px", fontSize: "0.95rem", lineHeight: 1.6 },
  "& li::marker": { color: "primary.main" },
};

/**
 * Line-by-line Markdown renderer for AI reports.
 * Also consumed by EvaluationHistory for saved resume reports.
 */
export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length === 0) return;
    elements.push(
      <Box component="ul" key={`list-${key}`} sx={listSx}>
        {currentList.map((li, idx) => (
          <li key={idx}>{li}</li>
        ))}
      </Box>,
    );
    currentList = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList(i);
      continue;
    }

    // Check for headings or section titles formatted as bold lines
    const isSectionHeader =
      /^#+/.test(line) ||
      /^(?:\*+|#+|\b)*(Executive Summary|Key Strengths|Missing Areas|Quick Actionable Improvements|Rubric Score Breakdown|Actionable Improvements|Matched Skills)(?:.*)(?:\*+|\b|:)*$/i.test(
        line,
      ) ||
      (line.startsWith("*") &&
        (line.endsWith("**") || line.endsWith("*")) &&
        line.length < 80 &&
        !/^[-*•]\s+/.test(line));

    if (isSectionHeader) {
      flushList(i);
      const level = line.startsWith("#") ? line.match(/^#+/)[0].length : 3;
      const cleanText = line
        .replace(/^#+\s*/, "")
        .replace(/^\*+|\*+$/g, "")
        .replace(/\*\*|__/g, "")
        .trim();

      if (level === 1) {
        elements.push(
          <Typography
            key={i}
            variant="h5"
            sx={{ mt: 3, mb: 1.25, fontWeight: 800, color: "text.primary" }}
          >
            {cleanText}
          </Typography>,
        );
      } else if (level === 2) {
        elements.push(
          <Typography
            key={i}
            variant="h6"
            sx={{ mt: 2.5, mb: 1, fontWeight: 800, color: "info.main" }}
          >
            {cleanText}
          </Typography>,
        );
      } else {
        elements.push(
          <Typography
            key={i}
            component="h4"
            sx={{
              mt: 2.75,
              mb: 1,
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "primary.main",
              pb: 0.75,
              borderBottom: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
            }}
          >
            {cleanText}
          </Typography>,
        );
      }
    }
    // Bullet list items (must have a space after the bullet)
    else if (
      /^([-•]|\*\s)\s+/.test(line) ||
      line.startsWith("- ") ||
      line.startsWith("* ") ||
      line.startsWith("• ")
    ) {
      currentList.push(parseInlineMarkdown(line.replace(/^[-*•]\s*/, "")));
    }
    // Numbered list items
    else if (/^\d+\.\s+/.test(line)) {
      flushList(i);
      elements.push(
        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "flex-start", my: 1 }}>
          <Box component="span" sx={{ color: "primary.main", fontWeight: 800, flexShrink: 0 }}>
            {line.match(/^\d+\./)[0]}
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.7, fontSize: "0.95rem" }}
          >
            {parseInlineMarkdown(line.replace(/^\d+\.\s*/, ""))}
          </Typography>
        </Stack>,
      );
    }
    // Regular paragraphs
    else {
      flushList(i);
      elements.push(
        <Typography
          key={i}
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.75, my: 1.25, fontSize: "0.95rem" }}
        >
          {parseInlineMarkdown(line)}
        </Typography>,
      );
    }
  }

  flushList("end");
  return elements;
}

// Dynamically load PDF.js client-side
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const ANALYSIS_STATUS = [
  "Extracting skills, roles and keywords…",
  "Mapping your resume against the job description…",
  "Scoring ATS compatibility and keyword density…",
  "Drafting recruiter-grade recommendations…",
  "Almost there — polishing the final report…",
];

const countWords = (value) => (value || "").split(/\s+/).filter(Boolean).length;

/* ================================================================== *
 * Sub-components
 * ================================================================== */

/** Animated PDF drop target with drag, hover and success states. */
function DropZone({ fileName, isDragActive, parsingPdf, onFile, onDragEvent, onDrop, onClear }) {
  const theme = useTheme();
  const inputRef = useRef(null);
  const accent = fileName ? theme.palette.success.main : theme.palette.primary.main;

  return (
    <Box
      onDragEnter={onDragEvent}
      onDragOver={onDragEvent}
      onDragLeave={onDragEvent}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      sx={{
        position: "relative",
        overflow: "hidden",
        px: 2,
        py: { xs: 2.5, sm: 3 },
        textAlign: "center",
        cursor: "pointer",
        borderRadius: 3,
        border: `2px dashed ${isDragActive ? theme.palette.primary.main : alpha(accent, fileName ? 0.5 : 0.28)}`,
        background: isDragActive
          ? alpha(theme.palette.primary.main, 0.1)
          : alpha(accent, fileName ? 0.06 : 0.03),
        transform: isDragActive ? "scale(1.02)" : "scale(1)",
        boxShadow: isDragActive ? `0 0 0 6px ${alpha(theme.palette.primary.main, 0.14)}` : "none",
        transition: "all .3s cubic-bezier(.22,1,.36,1)",
        "&:hover": {
          borderColor: theme.palette.primary.main,
          background: alpha(theme.palette.primary.main, 0.07),
        },
        "&:active": { transform: "scale(0.99)" },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Sweeping highlight while a file is dragged over the zone */}
      {isDragActive ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(110deg, transparent 30%, ${alpha(theme.palette.primary.main, 0.22)} 50%, transparent 70%)`,
            backgroundSize: "220% 100%",
            animation: "ll-shimmer 1.2s linear infinite",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <Box
        sx={{
          display: "inline-flex",
          p: 1.4,
          mb: 1,
          borderRadius: "50%",
          color: accent,
          background: alpha(accent, 0.14),
          animation: isDragActive
            ? "ll-bounce-sm .7s ease-in-out infinite"
            : "ll-float 4.5s ease-in-out infinite",
        }}
      >
        {parsingPdf ? (
          <CircularProgress size={28} thickness={5} />
        ) : fileName ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 28 }} />
        ) : (
          <CloudUploadRoundedIcon sx={{ fontSize: 28 }} />
        )}
      </Box>

      {fileName ? (
        <>
          <Typography sx={{ fontWeight: 700, color: "success.main", wordBreak: "break-word" }}>
            {fileName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click or drop another PDF to replace it
          </Typography>
        </>
      ) : (
        <>
          <Typography sx={{ fontWeight: 700 }}>
            {isDragActive ? "Drop it — we've got this" : "Drag & drop your resume PDF"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            or tap to browse files
          </Typography>
        </>
      )}

      <Stack direction="row" spacing={1} sx={{ justifyContent: "center", mt: 1.25 }}>
        <Chip
          size="small"
          label="Parsed locally by PDF.js"
          variant="outlined"
          sx={{ fontSize: "0.68rem", height: 22, color: "text.secondary" }}
        />
        {fileName ? (
          <Chip
            size="small"
            icon={<DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />}
            label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            sx={{ fontSize: "0.68rem", height: 22 }}
          />
        ) : null}
      </Stack>
    </Box>
  );
}

/** Word count + a "long enough?" meter under each text area. */
function InputMeter({ words, target, accent }) {
  const pct = Math.min(100, (words / target) * 100);
  return (
    <Stack spacing={0.75} sx={{ mt: 1.25 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          {words} words
        </Typography>
        <Typography variant="caption" sx={{ color: pct >= 100 ? "success.main" : "text.disabled" }}>
          {pct >= 100 ? "Good length" : `${target}+ recommended`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5,
          "& .MuiLinearProgress-bar": {
            backgroundColor: pct >= 100 ? "success.main" : accent,
            transition: "transform .6s cubic-bezier(.22,1,.36,1)",
          },
        }}
      />
    </Stack>
  );
}

/** Immersive full-page state shown while the AI call is in flight. */
function AnalyzingView({ onBack }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "72vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={onBack}
        sx={{ alignSelf: "flex-start", mb: 3, color: "text.secondary" }}
      >
        Back
      </Button>

      <Grow in timeout={500}>
        <GlassCard
          interactive={false}
          glow
          sx={{ maxWidth: 520, width: "100%", p: { xs: 3, sm: 4.5 }, textAlign: "center" }}
        >
          {/* Scanning document animation */}
          <Box
            sx={{
              position: "relative",
              width: 96,
              height: 118,
              mx: "auto",
              mb: 3,
              borderRadius: 2,
              overflow: "hidden",
              border: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              background: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            {/* Fake text lines */}
            <Stack spacing={0.9} sx={{ p: 1.5, pt: 2 }}>
              {[100, 78, 92, 64, 88, 70, 50].map((w, i) => (
                <Box
                  key={i}
                  sx={{
                    height: 5,
                    width: `${w}%`,
                    borderRadius: 999,
                    background: alpha(theme.palette.text.primary, 0.16),
                  }}
                />
              ))}
            </Stack>
            {/* Scan line */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 26,
                background: `linear-gradient(180deg, transparent, ${alpha(theme.palette.primary.main, 0.5)}, transparent)`,
                animation: "ll-scan 1.9s ease-in-out infinite",
                "@keyframes ll-scan": {
                  "0%": { top: "-26px" },
                  "100%": { top: "118px" },
                },
              }}
            />
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ justifyContent: "center", alignItems: "center" }}>
            <AutoAwesomeRoundedIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6">Analyzing your resume</Typography>
            <TypingDots />
          </Stack>

          <RotatingStatus messages={ANALYSIS_STATUS} sx={{ mt: 1.5, mb: 3 }} />

          <ScanBar />

          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
            This usually takes 10–25 seconds. Please keep this tab open.
          </Typography>
        </GlassCard>
      </Grow>
    </Box>
  );
}

/* ================================================================== *
 * Main component
 * ================================================================== */

export default function ResumeAnalyzer({ onBack, credits, onUpdateCredits }) {
  const { currentUser } = useAuth();
  const theme = useTheme();
  // `isPhone` drives the layout switches that only make sense on a handset
  // (stacked stepper, bottom-docked action bar); `isNarrow` only sizes content.
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));

  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");
  const [violationError, setViolationError] = useState("");
  const [report, setReport] = useState("");
  const [jdText, setJdText] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [toast, setToast] = useState("");

  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "")
  ).replace(/\/$/, "");

  const resumeWords = useMemo(() => countWords(resumeText), [resumeText]);
  const jdWords = useMemo(() => countWords(jdText), [jdText]);
  const hasJd = jdText.trim().length >= 15;

  const activeStep = report ? 3 : resumeText.trim() ? (hasJd ? 2 : 1) : 0;

  // Handle PDF Parsing
  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setParsingPdf(true);
    setError("");
    setViolationError("");
    setReport("");
    setFileName(file.name);

    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      const extracted = fullText.trim();
      if (!extracted) {
        throw new Error("No readable text found in PDF. Make sure it is not scanned/an image.");
      }

      setResumeText(extracted);
      setToast(`Extracted ${countWords(extracted)} words from ${file.name}`);

      // Immediately evaluate extracted text for experience violation
      const evalResult = evaluateExperience(extracted);
      if (evalResult.violated) {
        setViolationError(evalResult.reason);
      }
    } catch (err) {
      setError("Failed to parse PDF: " + (err.message || err));
      setFileName("");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handlePdfUpload(e.dataTransfer.files[0]);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setResumeText(text);
    setError("");
    setViolationError("");

    // Evaluate in real-time
    if (text.trim()) {
      const evalResult = evaluateExperience(text);
      if (evalResult.violated) {
        setViolationError(evalResult.reason);
      }
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmedResume = resumeText.trim();
    const trimmedJd = jdText.trim();
    if (!trimmedResume) {
      setError("Please paste resume text or upload a PDF first.");
      return;
    }

    // Double check violation
    const evalResult = evaluateExperience(trimmedResume);
    if (evalResult.violated) {
      setViolationError(evalResult.reason);
      // Warning only, do not block matching
    }

    if (currentUser && Number(credits) <= 0) {
      setError("You have no credits remaining. Please purchase more credits.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    try {
      const headers = { "Content-Type": "application/json" };
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const visitId = sessionStorage.getItem("leetlens_unregistered_visit_id") || "";

      const response = await fetch(`${API_BASE_URL}/api/resume/match`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          resumeText: trimmedResume,
          jdText: trimmedJd,
          fileName: fileName || "Pasted Text",
          visitId: visitId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to match resume with Job Description.");
      }

      setReport(data.report);
      setIsCollapsed(true);
      if (currentUser && typeof data.remainingCredits === "number") {
        onUpdateCredits?.(data.remainingCredits);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setToast("Report copied to clipboard");
  };

  if (loading) {
    return <AnalyzingView onBack={onBack} />;
  }

  const score = report ? extractScore(report) : null;
  const cleanReport = report
    ? report
        .replace(
          /^(?:#+\s*)?(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\n*/i,
          "",
        )
        .replace(
          /^\*\*(?:ATS|Match|Overall)?\s*Score\s*:\s*\d+(?:\s*%\s*|\s*\/\s*100\s*)\*\*\n*/i,
          "",
        )
        .trim()
    : "";

  const verdictColor = scoreColor(score, theme);
  const verdictCopy =
    score >= 80
      ? "Excellent match. Your resume aligns strongly with the role's requirements and keywords."
      : score >= 50
        ? "Solid foundation with real gaps. Work through the recommendations below to tailor it."
        : "Low compatibility. Rewrite around the missing skills and keywords listed below.";

  const ctaLabel = !hasJd
    ? currentUser
      ? "Run general evaluation (-1 credit)"
      : "Run general evaluation (free)"
    : currentUser
      ? "Match & analyze against JD (-1 credit)"
      : "Match & analyze against JD (free)";

  return (
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: { xs: 12, sm: 6 } }}>
      {/* ---------------- Page header ---------------- */}
      <Reveal direction="down" distance={16}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: { xs: 2, sm: 3 }, flexWrap: "wrap", rowGap: 1 }}>
          <Tooltip title="Back to dashboard">
            <IconButton
              onClick={onBack}
              sx={{
                border: `1px solid ${theme.ll.border}`,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
              }}
            >
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: "1.4rem", sm: "1.9rem" },
                background: theme.ll.gradientBrand,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "ll-gradient-pan 7s ease infinite",
              }}
            >
              Resume &amp; JD Matcher
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Recruiter-grade ATS scoring against any job description.
            </Typography>
          </Box>

          <Chip
            icon={<BoltRoundedIcon />}
            color={currentUser ? "primary" : "default"}
            variant={currentUser ? "filled" : "outlined"}
            label={currentUser ? `${credits} credits` : "Free session"}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Reveal>

      {/* ---------------- Stepper ---------------- */}
      <Reveal delay={60}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel={!isPhone}
          orientation={isPhone ? "vertical" : "horizontal"}
          sx={{
            mb: { xs: 2.5, sm: 4 },
            p: { xs: 1.5, sm: 2 },
            borderRadius: 4,
            border: `1px solid ${theme.ll.border}`,
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: "blur(12px)",
            "& .MuiStepLabel-label": { fontWeight: 700, fontSize: { xs: "0.82rem", sm: "0.9rem" } },
            "& .MuiStepIcon-root": { transition: "transform .35s cubic-bezier(.22,1,.36,1)" },
            "& .MuiStep-root:hover .MuiStepIcon-root": { transform: "scale(1.18)" },
          }}
        >
          {["Add your resume", "Paste the job description", "Review the match report"].map(
            (label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ),
          )}
        </Stepper>
      </Reveal>

      {/* ---------------- Collapsed summary (after a report) ---------------- */}
      <Collapse in={isCollapsed} timeout={420} unmountOnExit>
        <GlassCard accent={theme.palette.primary.main} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              divider={
                !isPhone ? <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} /> : null
              }
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <DescriptionRoundedIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography variant="overline" color="text.disabled" sx={{ fontSize: "0.64rem" }}>
                    Resume attached
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>
                    {fileName || "Pasted text"} · {resumeWords} words
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <WorkRoundedIcon sx={{ color: "info.main" }} />
                <Box>
                  <Typography variant="overline" color="text.disabled" sx={{ fontSize: "0.64rem" }}>
                    Target job description
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>
                    {hasJd ? `JD attached · ${jdWords} words` : "General evaluation (no JD)"}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <PulseButton
              startIcon={<EditRoundedIcon />}
              onClick={() => setIsCollapsed(false)}
              sx={{ flexShrink: 0 }}
            >
              Edit &amp; run new analysis
            </PulseButton>
          </Stack>
        </GlassCard>
      </Collapse>

      {/* ---------------- Input surfaces ---------------- */}
      <Collapse in={!isCollapsed} timeout={420} unmountOnExit>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: { xs: 2, sm: 3 },
          }}
        >
          {/* Resume input */}
          <Reveal direction="left" delay={80}>
            <GlassCard sx={{ p: { xs: 2, sm: 2.75 }, height: "100%" }}>
              <SectionHeading
                icon={<DescriptionRoundedIcon />}
                title="Your resume"
                subtitle="Upload a PDF or paste the raw text"
              />

              <DropZone
                fileName={fileName}
                isDragActive={isDragActive}
                parsingPdf={parsingPdf}
                onFile={handlePdfUpload}
                onDragEvent={handleDrag}
                onDrop={handleDrop}
                onClear={() => {
                  setFileName("");
                  setResumeText("");
                  setViolationError("");
                }}
              />

              <Collapse in={parsingPdf}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1.5 }}>
                  <CircularProgress size={14} thickness={6} />
                  <Typography variant="caption" color="primary.main">
                    Extracting text from your PDF…
                  </Typography>
                </Stack>
              </Collapse>

              <Divider sx={{ my: 2.5 }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontSize: "0.64rem" }}>
                  or paste text
                </Typography>
              </Divider>

              <TextField
                value={resumeText}
                onChange={handleTextChange}
                placeholder="Paste your full resume text here…"
                multiline
                minRows={9}
                maxRows={18}
                fullWidth
              />
              <InputMeter words={resumeWords} target={180} accent={theme.palette.primary.main} />
            </GlassCard>
          </Reveal>

          {/* JD input */}
          <Reveal direction="right" delay={140}>
            <GlassCard accent={theme.palette.info.main} sx={{ p: { xs: 2, sm: 2.75 }, height: "100%" }}>
              <SectionHeading
                icon={<WorkRoundedIcon />}
                accent={theme.palette.info.main}
                title="Job description"
                subtitle="Optional — leave blank for a general evaluation"
              />

              <TextField
                value={jdText}
                onChange={(e) => {
                  setJdText(e.target.value);
                  setError("");
                }}
                placeholder="Paste the target job description — skills, requirements, responsibilities…"
                multiline
                minRows={isNarrow ? 9 : 16}
                maxRows={26}
                fullWidth
              />
              <InputMeter words={jdWords} target={80} accent={theme.palette.info.main} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", mt: 2,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`, }}>
                <TipsAndUpdatesRoundedIcon sx={{ color: "info.main", fontSize: 19, mt: "1px" }} />
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Adding a JD switches the report from a general review to a targeted
                  keyword-by-keyword match — usually a much sharper score.
                </Typography>
              </Stack>
            </GlassCard>
          </Reveal>
        </Box>

        {/* Experience-policy warning */}
        <Collapse in={Boolean(violationError)}>
          <Alert
            severity="warning"
            icon={<WarningAmberRoundedIcon />}
            sx={{ mt: 3, animation: "ll-pop-in .4s cubic-bezier(.22,1,.36,1)" }}
          >
            <AlertTitle sx={{ fontWeight: 800 }}>Experience level above 1 year</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              We detected details suggesting more than 1 year of experience ({violationError})
            </Typography>
            <Chip size="small" color="info" variant="outlined" label="Warning only — analysis still runs" />
          </Alert>
        </Collapse>

        {/* Error */}
        <Collapse in={Boolean(error)}>
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        </Collapse>

        {/* Action bar — docks to the bottom of the viewport on phones */}
        <Box
          sx={{
            mt: 3,
            position: { xs: "fixed", sm: "static" },
            bottom: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            right: { xs: 0, sm: "auto" },
            zIndex: { xs: 1150, sm: "auto" },
            p: { xs: 1.5, sm: 0 },
            pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 0 },
            background: {
              xs: alpha(theme.palette.background.default, 0.92),
              sm: "transparent",
            },
            backdropFilter: { xs: "blur(16px)", sm: "none" },
            borderTop: { xs: `1px solid ${theme.ll.border}`, sm: "none" },
          }}
        >
          <GlassCard
            interactive={false}
            sx={{
              p: { xs: 1.25, sm: 2 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              border: { xs: "none", sm: `1px solid ${theme.ll.border}` },
              background: { xs: "transparent", sm: undefined },
              backdropFilter: { xs: "none", sm: undefined },
              boxShadow: { xs: "none", sm: undefined },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", display: { xs: "none", sm: "flex" } }}>
              <InsightsRoundedIcon sx={{ color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {hasJd ? "Targeted JD match" : "General resume evaluation"}
              </Typography>
            </Stack>

            <PulseButton
              size="large"
              onClick={handleSubmit}
              disabled={parsingPdf || !resumeText.trim()}
              startIcon={<AutoAwesomeRoundedIcon />}
              gradient={theme.ll.gradientPrimary}
              sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 280 } }}
            >
              {ctaLabel}
            </PulseButton>
          </GlassCard>
        </Box>
      </Collapse>

      {/* ---------------- Report ---------------- */}
      {report ? (
        <Fade in timeout={600}>
          <Box sx={{ mt: 3 }}>
            {/* Score hero */}
            {score !== null ? (
              <Grow in timeout={700}>
                <GlassCard
                  accent={verdictColor}
                  glow
                  interactive={false}
                  sx={{ p: { xs: 2.5, sm: 3.5 }, mb: 3 }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2.5, sm: 4 }} sx={{ alignItems: "center" }}>
                    <ScoreGauge value={score} size={isNarrow ? 128 : 152} label="ATS" />

                    <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-start" }, mb: 1, rowGap: 1 }}>
                        <Chip
                          label="ATS compatibility"
                          size="small"
                          sx={{
                            bgcolor: alpha(verdictColor, 0.16),
                            color: verdictColor,
                            border: `1px solid ${alpha(verdictColor, 0.4)}`,
                          }}
                        />
                        <Chip
                          label={hasJd ? "Matched against JD" : "General evaluation"}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      <Typography variant="h5" sx={{ mb: 1 }}>
                        {score >= 80
                          ? "Strong match"
                          : score >= 50
                            ? "Promising, needs tailoring"
                            : "Needs significant work"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {verdictCopy}
                      </Typography>

                      <LinearProgress
                        variant="determinate"
                        value={score}
                        sx={{
                          mt: 2,
                          height: 9,
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: verdictColor,
                            transition: "transform 1.4s cubic-bezier(.22,1,.36,1)",
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </GlassCard>
              </Grow>
            ) : null}

            {/* Report body */}
            <Reveal delay={120}>
              <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3.5 } }}>
                <SectionHeading
                  icon={<InsightsRoundedIcon />}
                  title="Recruiter assessment report"
                  subtitle="Generated for this resume + job description pair"
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyRoundedIcon />}
                        onClick={handleCopy}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditRoundedIcon />}
                        onClick={() => {
                          setIsCollapsed(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        New
                      </Button>
                    </Stack>
                  }
                />
                <Divider sx={{ mb: 2.5 }} />
                <Box sx={{ "& > *:first-of-type": { mt: 0 } }}>{renderMarkdown(cleanReport)}</Box>
              </GlassCard>
            </Reveal>
          </Box>
        </Fade>
      ) : null}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2600}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={Zoom}
        sx={{ bottom: { xs: 96, sm: 24 } }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
