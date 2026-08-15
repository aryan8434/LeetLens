import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Grow from "@mui/material/Grow";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";

import { useAuth } from "../contexts/AuthContext";
import {
  AnimatedNumber,
  EmptyState,
  GlassCard,
  PageHeader,
  PulseButton,
  Reveal,
  SectionHeading,
} from "./ui";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

const PURCHASE_PACKAGES = [
  {
    key: "10_rs9",
    name: "Starter Pack",
    priceRs: 9,
    credits: 10,
    perCredit: "₹0.90 / credit",
    badge: null,
    description: "Great for quick profile evaluations and single report generation.",
  },
  {
    key: "20_rs19",
    name: "Popular Pack",
    priceRs: 19,
    credits: 20,
    perCredit: "₹0.95 / credit",
    badge: "MOST POPULAR",
    description: "Best for active practice, multiple profile checks & AI coaching reports.",
  },
  {
    key: "50_rs29",
    name: "Pro Value Pack",
    priceRs: 29,
    credits: 50,
    perCredit: "₹0.58 / credit",
    badge: "BEST VALUE",
    description: "Maximum savings for power users, complete skill readiness & deep breakdown.",
  },
];

export default function CreditsPage({ onBack }) {
  const { currentUser, credits, setCredits, userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [timeLeft, setTimeLeft] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [purchasingKey, setPurchasingKey] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const lastClaimedStr = userProfile?.lastClaimedFreeCredits;

  useEffect(() => {
    if (!lastClaimedStr) {
      setTimeLeft(0);
      return undefined;
    }

    const calculateTimeLeft = () => {
      const lastClaimedTime = new Date(lastClaimedStr).getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = lastClaimedTime + oneWeekMs - now;
      return diff > 0 ? Math.floor(diff / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaimedStr]);

  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return "";
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const getAuthHeaders = async () => {
    if (!currentUser) return {};
    const token = await currentUser.getIdToken(true);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadTransactions = async () => {
    if (!currentUser) return;
    setLoadingTx(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/credits/transactions`, {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentUser]);

  const handleClaimFreeCredits = async () => {
    if (!currentUser) return;
    setClaiming(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/credits/claim-free`, {
        method: "POST",
        headers: await getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to claim free credits.");
      }

      setCredits(data.credits);
      loadTransactions();
      setStatus({
        type: "success",
        message: "Successfully claimed 3 free credits! Weekly cooldown started.",
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to claim credits." });
    } finally {
      setClaiming(false);
    }
  };

  const handlePurchaseCredits = async (pkg) => {
    if (!currentUser) {
      setStatus({ type: "error", message: "Please log in to purchase credits." });
      return;
    }

    setPurchasingKey(pkg.key);
    setStatus({ type: "", message: "" });

    try {
      // Step 1: Create Razorpay Order on Backend
      const orderRes = await fetch(`${API_BASE_URL}/api/credits/create-order`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ packageKey: pkg.key }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Step 2: Open Razorpay Standard Checkout Modal
      const options = {
        key:
          orderData.key_id ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          "rzp_test_TFM4cTiksu0var",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "LeetLens",
        description: `Purchase ${pkg.credits} Credits for ₹${pkg.priceRs}`,
        image: "/logo.png",
        order_id: orderData.order_id,
        handler: async function (response) {
          // Step 3: Verify Payment Signature on Backend
          try {
            setPurchasingKey(pkg.key);
            const verifyRes = await fetch(`${API_BASE_URL}/api/credits/verify-payment`, {
              method: "POST",
              headers: await getAuthHeaders(),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageKey: pkg.key,
              }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            setCredits(verifyData.credits);
            loadTransactions();
            setStatus({
              type: "success",
              message: `🎉 Payment successful! Added ${pkg.credits} credits for ₹${pkg.priceRs}. Total balance: ${verifyData.credits} credits.`,
            });
          } catch (verifyErr) {
            setStatus({
              type: "error",
              message: verifyErr.message || "Payment verification failed.",
            });
          } finally {
            setPurchasingKey(null);
          }
        },
        prefill: {
          name: userProfile?.name || currentUser.displayName || "",
          email: currentUser.email || "",
        },
        theme: { color: "#38bdf8" },
      };

      if (typeof window.Razorpay !== "function") {
        throw new Error("Razorpay SDK not loaded. Please refresh the page and try again.");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setStatus({
          type: "error",
          message: `Payment failed: ${response.error?.description || "Transaction failed"}`,
        });
        setPurchasingKey(null);
      });
      rzp.open();
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to initiate payment." });
      setPurchasingKey(null);
    }
  };

  const canClaim = timeLeft <= 0;

  return (
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 6 }}>
      <PageHeader
        title="Credits"
        subtitle="Claim your weekly free credits or top up instantly."
        onBack={onBack}
        action={
          <Chip
            icon={<BoltRoundedIcon />}
            color="primary"
            label={`${credits} available`}
            sx={{ fontWeight: 700 }}
          />
        }
      />

      <Collapse in={Boolean(status.message)}>
        <Alert
          severity={status.type === "success" ? "success" : "error"}
          sx={{ mb: 2.5, animation: "ll-pop-in .35s cubic-bezier(.22,1,.36,1)" }}
          onClose={() => setStatus({ type: "", message: "" })}
        >
          {status.message}
        </Alert>
      </Collapse>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: { xs: 2, sm: 3 },
          alignItems: "start",
        }}
      >
        {/* ---------- Balance ---------- */}
        <Reveal direction="left">
          <GlassCard glow sx={{ p: { xs: 2.5, sm: 3 }, textAlign: "center" }}>
            <Box
              sx={{
                display: "inline-grid",
                placeItems: "center",
                width: 76,
                height: 76,
                mb: 2,
                borderRadius: "50%",
                color: "primary.main",
                background: alpha(theme.palette.primary.main, 0.13),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                animation: "ll-float 5s ease-in-out infinite",
              }}
            >
              <TokenRoundedIcon sx={{ fontSize: 38 }} />
            </Box>

            <Typography variant="overline" color="text.secondary">
              Credits available
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "3.4rem",
                lineHeight: 1.1,
                background: theme.ll.gradientPrimary,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <AnimatedNumber value={Number(credits) || 0} />
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              1 credit = 1 AI coach evaluation, 1 resume match, or 1 deep-dive unlock.
            </Typography>
          </GlassCard>
        </Reveal>

        {/* ---------- Main column ---------- */}
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {/* Weekly free claim */}
          <Reveal direction="right" delay={70}>
            <GlassCard accent={theme.palette.success.main} sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1.75} sx={{ alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      width: 46,
                      height: 46,
                      flexShrink: 0,
                      borderRadius: 2.5,
                      color: "success.main",
                      background: alpha(theme.palette.success.main, 0.13),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  >
                    <RedeemRoundedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
                      Weekly free reward
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Claim 3 free credits every week. A 7-day cooldown starts after each claim.
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={1} sx={{ alignItems: { xs: "stretch", sm: "flex-end" }, flexShrink: 0 }}>
                  {!canClaim ? (
                    <Chip
                      icon={<LockClockRoundedIcon />}
                      label={formatCountdown(timeLeft)}
                      variant="outlined"
                      sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
                    />
                  ) : null}
                  <PulseButton
                    color="success"
                    disabled={!canClaim || claiming || purchasingKey !== null}
                    onClick={handleClaimFreeCredits}
                    gradient={`linear-gradient(135deg, ${theme.palette.success.main}, #16a34a)`}
                    sx={{ minWidth: 190 }}
                  >
                    {claiming ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : canClaim ? (
                      "Claim 3 free credits"
                    ) : (
                      "Claim locked"
                    )}
                  </PulseButton>
                </Stack>
              </Stack>
            </GlassCard>
          </Reveal>

          {/* Packages */}
          <Reveal delay={120}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
              <SectionHeading
                icon={<ShoppingCartRoundedIcon />}
                title="Buy credits"
                subtitle="Secure checkout via Razorpay — UPI, cards, netbanking."
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(220px, 1fr))" },
                  gap: 2,
                }}
              >
                {PURCHASE_PACKAGES.map((pkg, index) => {
                  const isBuying = purchasingKey === pkg.key;
                  const highlighted = Boolean(pkg.badge);
                  const accent = highlighted ? theme.palette.primary.main : theme.palette.info.main;

                  return (
                    <Grow in timeout={480 + index * 130} key={pkg.key}>
                      <Box
                        sx={{
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          p: 2.5,
                          pt: highlighted ? 3.25 : 2.5,
                          borderRadius: 4,
                          background: alpha(accent, highlighted ? 0.1 : 0.05),
                          border: `1px solid ${alpha(accent, highlighted ? 0.42 : 0.2)}`,
                          boxShadow: highlighted
                            ? `0 0 34px ${alpha(accent, 0.22)}`
                            : "none",
                          transition:
                            "transform .32s cubic-bezier(.22,1,.36,1), box-shadow .32s ease",
                          "&:hover": {
                            transform: "translateY(-6px)",
                            boxShadow: `0 18px 44px ${alpha(accent, 0.28)}`,
                          },
                        }}
                      >
                        {pkg.badge ? (
                          <Chip
                            label={pkg.badge}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: -11,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontSize: "0.62rem",
                              height: 22,
                              fontWeight: 800,
                              background: theme.ll.gradientPrimary,
                              color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
                            }}
                          />
                        ) : null}

                        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                          {pkg.name}
                        </Typography>

                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "baseline" }}>
                          <Typography sx={{ fontSize: "1.1rem", color: accent, fontWeight: 700 }}>
                            ₹
                          </Typography>
                          <Typography sx={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1 }}>
                            {pkg.priceRs}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1.5 }}>
                          <Chip
                            label={`${pkg.credits} credits`}
                            size="small"
                            sx={{ bgcolor: alpha(accent, 0.16), color: accent, fontSize: "0.72rem" }}
                          />
                          <Chip
                            label={pkg.perCredit}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.72rem" }}
                          />
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2.5, flexGrow: 1, lineHeight: 1.6 }}
                        >
                          {pkg.description}
                        </Typography>

                        <PulseButton
                          fullWidth
                          disabled={purchasingKey !== null}
                          onClick={() => handlePurchaseCredits(pkg)}
                          startIcon={!isBuying ? <BoltRoundedIcon /> : null}
                          gradient={
                            highlighted
                              ? theme.ll.gradientPrimary
                              : `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.primary.main})`
                          }
                        >
                          {isBuying ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            `Pay ₹${pkg.priceRs}`
                          )}
                        </PulseButton>
                      </Box>
                    </Grow>
                  );
                })}
              </Box>
            </GlassCard>
          </Reveal>

          {/* Transactions */}
          <Reveal delay={170}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
              <SectionHeading
                icon={<ReceiptLongRoundedIcon />}
                title="Payment history"
                subtitle="Every credit top-up processed on your account."
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={loadTransactions}
                    disabled={loadingTx}
                  >
                    Refresh
                  </Button>
                }
              />

              {loadingTx ? (
                <Stack spacing={1.5} sx={{ alignItems: "center", py: 5 }}>
                  <CircularProgress size={30} />
                  <Typography variant="body2" color="text.secondary">
                    Loading transaction history…
                  </Typography>
                </Stack>
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={<ReceiptLongRoundedIcon sx={{ fontSize: 44 }} />}
                  title="No transactions yet"
                  description="Once you buy credits above, your receipts and balance changes appear here instantly."
                />
              ) : isMobile ? (
                /* Card list on phones — tables don't work at 375px */
                <Stack spacing={1.5}>
                  {transactions.map((tx) => {
                    const pkgName =
                      PURCHASE_PACKAGES.find((p) => p.key === tx.packageKey)?.name ||
                      "Credits package";
                    return (
                      <Box
                        key={tx.id}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${theme.ll.border}`,
                          background: alpha(theme.palette.background.paper, 0.4),
                        }}
                      >
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ fontWeight: 800, color: "primary.main" }}>
                            +{tx.credits} credits
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: "success.main" }}>
                            ₹{tx.amountRs}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {pkgName} · {tx.dateStr}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1.25 }}>
                          <Chip
                            size="small"
                            icon={<VerifiedRoundedIcon sx={{ fontSize: 15 }} />}
                            label={tx.status}
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.7rem" }}
                          />
                          <Typography variant="caption" color="text.disabled" noWrap>
                            {tx.method}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${theme.ll.border}`,
                    overflowX: "auto",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableCell>Date</TableCell>
                        <TableCell>Package / credits</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((tx) => {
                        const pkgName =
                          PURCHASE_PACKAGES.find((p) => p.key === tx.packageKey)?.name ||
                          "Credits package";
                        return (
                          <TableRow
                            key={tx.id}
                            sx={{
                              transition: "background-color .2s ease",
                              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                            }}
                          >
                            <TableCell sx={{ whiteSpace: "nowrap", py: 1.5 }}>
                              {tx.dateStr}
                            </TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                              <Typography sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.9rem" }}>
                                +{tx.credits} credits
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {pkgName}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.5, fontWeight: 800, color: "success.main" }}>
                              ₹{tx.amountRs}
                            </TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                              <Typography variant="body2">{tx.method}</Typography>
                              {tx.paymentId && tx.paymentId !== "Completed Transaction" ? (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{ fontFamily: "monospace" }}
                                >
                                  {tx.paymentId}
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.5 }}>
                              <Chip
                                size="small"
                                icon={<VerifiedRoundedIcon sx={{ fontSize: 15 }} />}
                                label={tx.status}
                                color="success"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </GlassCard>
          </Reveal>
        </Stack>
      </Box>
    </Box>
  );
}
