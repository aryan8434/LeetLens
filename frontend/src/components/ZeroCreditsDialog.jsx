import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Grow from "@mui/material/Grow";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

import { PulseButton } from "./ui";

/** Razorpay hosted payment button — injected as a script into a form element. */
function RazorpayPaymentButton({ buttonId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", buttonId);
    script.async = true;

    form.appendChild(script);
    containerRef.current.appendChild(form);
  }, [buttonId]);

  return (
    <Box
      ref={containerRef}
      sx={{ display: "flex", justifyContent: "center", width: "100%", minHeight: 40 }}
    />
  );
}

const TIERS = [
  { key: "10_rs9", name: "10 credits", priceRs: 9, buttonId: "pl_TKrPIxTPp9fzl9" },
  { key: "20_rs19", name: "20 credits", priceRs: 19, badge: "POPULAR", buttonId: "pl_TKrTQCnAuvKEYk" },
  { key: "50_rs29", name: "50 credits", priceRs: 29, badge: "BEST VALUE" },
];

export default function ZeroCreditsDialog({ open, onClose, onManageCredits, onCheckout }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      slots={{ transition: Grow }}
      transitionDuration={320}
    >
      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
        aria-label="Close"
      >
        <CloseRoundedIcon />
      </IconButton>

      <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, textAlign: "center" }}>
        <Box
          sx={{
            display: "inline-grid",
            placeItems: "center",
            width: 72,
            height: 72,
            mb: 2,
            borderRadius: "50%",
            color: "error.main",
            background: alpha(theme.palette.error.main, 0.13),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            animation: "ll-pulse-glow 2.6s ease-in-out infinite",
          }}
        >
          <ErrorOutlineRoundedIcon sx={{ fontSize: 38 }} />
        </Box>

        <Typography variant="h5" sx={{ mb: 1 }}>
          You're out of credits
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 420, mx: "auto", mb: 3.5, lineHeight: 1.7 }}
        >
          Pick a top-up below to buy instantly, or open the credits page to claim your free
          weekly reward.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 1.75,
          }}
        >
          {TIERS.map((tier, index) => {
            const highlighted = Boolean(tier.badge);
            const accent = highlighted ? theme.palette.primary.main : theme.palette.info.main;

            return (
              <Grow in={open} timeout={400 + index * 120} key={tier.key}>
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 2,
                    pt: highlighted ? 2.75 : 2,
                    borderRadius: 3.5,
                    background: alpha(accent, highlighted ? 0.1 : 0.05),
                    border: `1px solid ${alpha(accent, highlighted ? 0.42 : 0.2)}`,
                    transition: "transform .3s cubic-bezier(.22,1,.36,1)",
                    "&:hover": { transform: "translateY(-4px)" },
                  }}
                >
                  {tier.badge ? (
                    <Chip
                      label={tier.badge}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        height: 20,
                        fontSize: "0.58rem",
                        fontWeight: 800,
                        background: theme.ll.gradientPrimary,
                        color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
                      }}
                    />
                  ) : null}

                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {tier.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      lineHeight: 1.2,
                      mb: 1.5,
                      color: accent,
                    }}
                  >
                    ₹{tier.priceRs}
                  </Typography>

                  <Box sx={{ mt: "auto", width: "100%" }}>
                    {tier.buttonId ? (
                      <RazorpayPaymentButton buttonId={tier.buttonId} />
                    ) : (
                      <PulseButton
                        fullWidth
                        size="small"
                        startIcon={<BoltRoundedIcon />}
                        onClick={() => onCheckout(tier)}
                        gradient={theme.ll.gradientPrimary}
                      >
                        Pay ₹{tier.priceRs}
                      </PulseButton>
                    )}
                  </Box>
                </Box>
              </Grow>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, pb: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>
          Not now
        </Button>
        <PulseButton onClick={onManageCredits} gradient={theme.ll.gradientPrimary}>
          Manage all credits
        </PulseButton>
      </DialogActions>
    </Dialog>
  );
}
