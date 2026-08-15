import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

/* ================================================================== *
 * Report text parsing
 * ================================================================== */

export function parseReportSections(reportText) {
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
    const headingMatch = clean.match(/^(?:Section\s+\d+\s*[:-]\s*|\d+[.)]\s+)?(.+)$/i);

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
      keywords.some((keyword) => clean.toLowerCase().includes(keyword)) && clean.length < 50;

    // Data lines like "FAANG: 70/100" are content, not headings.
    const tempClean = clean.replace(/^(?:Section\s+\d+\s*[:-]\s*|\d+[.)]\s+)/i, "").trim();
    const isDataLine = /:\s*\d+/.test(tempClean);

    const isHeading = (isExplicitSection || startsWithHash || isKeywordHeader) && !isDataLine;

    if (isHeading && headingMatch) {
      let title = headingMatch[1]
        .replace(/^[*_]+/, "")
        .replace(/[*_]+$/, "")
        .trim();

      if (!title || /^\d+$/.test(title)) {
        title = clean;
      }

      current = { title, items: [] };
      sections.push(current);
      return;
    }

    if (!current) {
      current = { title: "Evaluation Report", items: [] };
      sections.push(current);
    }

    current.items.push(line.replace(/^[-*•]\s*/, ""));
  });

  return sections;
}

export function normalizeSectionTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findSection(sections, includesText) {
  return sections.find((section) => normalizeSectionTitle(section.title).includes(includesText));
}

export function extractScore(scoreSection) {
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

export function pairReadinessItems(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i] || "";
    const next = items[i + 1] || "";
    if (next.toLowerCase().startsWith("reason:")) {
      pairs.push({ heading: current, details: next });
      i += 1;
    } else {
      pairs.push({ heading: current, details: "" });
    }
  }
  return pairs;
}

export function parseReadinessHeading(headingLine) {
  const match = headingLine.match(/^\s*([^:]+):\s*(\d{1,3})\s*\/\s*100\s*$/i);
  if (!match) {
    return { label: headingLine.replace(/:\s*$/, ""), score: null };
  }
  return { label: match[1], score: Number(match[2]) };
}

export function getAverageReadiness(items) {
  const scores = items
    .map((row) => parseReadinessHeading(row.heading).score)
    .filter((score) => typeof score === "number" && !Number.isNaN(score));

  if (!scores.length) {
    return null;
  }

  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function pairHeadingDetailItems(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i] || "";
    const next = items[i + 1] || "";
    if (current.endsWith(":") && next) {
      pairs.push({ heading: current, details: next });
      i += 1;
    } else {
      pairs.push({ heading: current, details: "" });
    }
  }
  return pairs;
}

/* ================================================================== *
 * Inline rendering
 * ================================================================== */

const FAANG_LETTERS = [
  { char: "F", color: "#1877f2" },
  { char: "A", color: "#ff9900" },
  { char: "A", color: "#a3aaae" },
  { char: "N", color: "#e50914" },
  { char: "G", color: "#34a853" },
];

const TOKEN_SX = {
  hard: { color: "error.main", fontWeight: 700 },
  medium: { color: "warning.main", fontWeight: 700 },
  easy: { color: "success.main", fontWeight: 700 },
  product: { color: "info.main", fontWeight: 700 },
  service: { color: "primary.main", fontWeight: 700 },
  strong: { color: "success.main", fontWeight: 700 },
  weak: { color: "error.main", fontWeight: 700 },
  percent: { color: "primary.main", fontWeight: 800 },
};

function tokenKey(token) {
  if (/^(Hard|hard)$/.test(token)) return "hard";
  if (/^(Medium|medium)$/.test(token)) return "medium";
  if (/^(Easy|easy)$/.test(token)) return "easy";
  if (/^Product-based$/.test(token)) return "product";
  if (/^Service-based$/.test(token)) return "service";
  if (/^(strong|Strong)$/.test(token)) return "strong";
  if (/^(weak|Weak)$/.test(token)) return "weak";
  if (/^\d+(?:\.\d+)?%$/.test(token)) return "percent";
  return null;
}

/** Colour-codes difficulty words, company tiers and percentages inside a line. */
export function renderLineWithHighlights(line) {
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
          <Box component="span" key={`faang-${tIdx}`} aria-label="FAANG" sx={{ fontWeight: 800 }}>
            {FAANG_LETTERS.map((letter, i) => (
              <Box component="span" key={i} sx={{ color: letter.color }}>
                {letter.char}
              </Box>
            ))}
          </Box>
        );
      }

      const key = tokenKey(token);
      if (!key) {
        return <span key={`token-${tIdx}`}>{token}</span>;
      }

      return (
        <Box component="span" key={`token-${tIdx}`} sx={TOKEN_SX[key]}>
          {token}
        </Box>
      );
    });

    if (isBold) {
      return (
        <Box
          component="strong"
          key={`bold-${index}`}
          sx={{ color: "text.primary", fontWeight: 800 }}
        >
          {renderedTokens}
        </Box>
      );
    }

    return <span key={`normal-${index}`}>{renderedTokens}</span>;
  });
}

/** Full markdown block renderer used by the standalone deep-dive pages. */
export function renderMarkdownLines(text) {
  if (!text) return null;

  return text.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <Box key={index} sx={{ height: 8 }} />;
    }

    if (trimmed.startsWith("###")) {
      return (
        <Typography
          key={index}
          component="h4"
          sx={{ mt: 2.5, mb: 1, fontSize: "1.08rem", fontWeight: 800, color: "primary.main" }}
        >
          {renderLineWithHighlights(trimmed.replace(/^###\s*/, ""))}
        </Typography>
      );
    }
    if (trimmed.startsWith("##")) {
      return (
        <Typography key={index} variant="h6" sx={{ mt: 3, mb: 1.25, color: "info.main" }}>
          {renderLineWithHighlights(trimmed.replace(/^##\s*/, ""))}
        </Typography>
      );
    }
    if (trimmed.startsWith("#")) {
      return (
        <Typography key={index} variant="h5" sx={{ mt: 3.5, mb: 1.5 }}>
          {renderLineWithHighlights(trimmed.replace(/^#\s*/, ""))}
        </Typography>
      );
    }

    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      return (
        <Stack key={index} direction="row" spacing={1.25} sx={{ alignItems: "flex-start", my: 0.75 }}>
          <Box
            component="span"
            sx={{ color: "primary.main", fontWeight: 800, lineHeight: 1.7, flexShrink: 0 }}
          >
            •
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.75, fontSize: "0.95rem" }}
          >
            {renderLineWithHighlights(trimmed.replace(/^[-*]\s*/, ""))}
          </Typography>
        </Stack>
      );
    }

    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      return (
        <Stack key={index} direction="row" spacing={1.25} sx={{ alignItems: "flex-start", my: 0.75 }}>
          <Box
            component="span"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              lineHeight: 1.7,
              flexShrink: 0,
              minWidth: 22,
            }}
          >
            {numListMatch[1]}.
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.75, fontSize: "0.95rem" }}
          >
            {renderLineWithHighlights(numListMatch[2])}
          </Typography>
        </Stack>
      );
    }

    return (
      <Typography
        key={index}
        variant="body2"
        sx={{ color: "text.secondary", lineHeight: 1.8, my: 1.25, fontSize: "0.95rem" }}
      >
        {renderLineWithHighlights(line)}
      </Typography>
    );
  });
}

/* ================================================================== *
 * Dashboard helpers
 * ================================================================== */

export const TOPIC_COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#f97316",
];

export function getTopicColor(index) {
  return TOPIC_COLORS[index % TOPIC_COLORS.length];
}

export function getMonthTicks(heatmap) {
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

export function getHeatLevel(count, maxCount) {
  if (count <= 0) return 0;

  const ratio = count / Math.max(1, maxCount);
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

/** Background for a contribution-heatmap cell at the given intensity level. */
export function heatCellColor(level, theme) {
  if (level === 0) return alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.07 : 0.08);
  const opacities = [0, 0.28, 0.48, 0.7, 1];
  return alpha(theme.palette.primary.main, opacities[level]);
}
