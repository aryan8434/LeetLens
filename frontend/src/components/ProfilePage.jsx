import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Grow from "@mui/material/Grow";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import { alpha, useTheme } from "@mui/material/styles";

import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import NumbersRoundedIcon from "@mui/icons-material/NumbersRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import { useAuth } from "../contexts/AuthContext";
import {
  AnimatedNumber,
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

export default function ProfilePage({ onBack }) {
  const { userProfile, updateProfileData, credits, setCredits, currentUser, changePassword } =
    useAuth();
  const theme = useTheme();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdStatus, setPwdStatus] = useState({ type: "", message: "" });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [purchasingKey, setPurchasingKey] = useState(null);
  const [creditStatus, setCreditStatus] = useState({ type: "", message: "" });

  const isGoogleUser = currentUser?.providerData?.some(
    (provider) => provider.providerId === "google.com",
  );

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setDob(userProfile.dob || "");
      setAge(userProfile.age || "");
      setLocation(userProfile.location || "");
      setBio(userProfile.bio || "");
    }
  }, [userProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      await updateProfileData({
        name,
        dob,
        age: age ? Number(age) : 0,
        location,
        bio,
      });
      setStatus({ type: "success", message: "Profile updated successfully!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setPwdStatus({ type: "error", message: "Password cannot be empty." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPwdStatus({ type: "error", message: "Password should be at least 6 characters." });
      return;
    }

    setPwdLoading(true);
    setPwdStatus({ type: "", message: "" });

    try {
      await changePassword(newPassword);
      setPwdStatus({ type: "success", message: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      let friendlyMessage = err.message || "Failed to update password.";
      if (err.code === "auth/requires-recent-login") {
        friendlyMessage =
          "For security reasons, please log out and log back in to change your password.";
      }
      setPwdStatus({ type: "error", message: friendlyMessage });
    } finally {
      setPwdLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    if (!currentUser) return {};
    const token = await currentUser.getIdToken(true);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const handlePurchaseCredits = async (pkg) => {
    if (!currentUser) return;
    setPurchasingKey(pkg.key);
    setCreditStatus({ type: "", message: "" });

    try {
      // Step 1: Create Order
      const orderRes = await fetch(`${API_BASE_URL}/api/credits/create-order`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ packageKey: pkg.key }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Step 2: Open Razorpay Modal
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
          // Step 3: Verify Payment Signature
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
            setCreditStatus({
              type: "success",
              message: `🎉 Payment successful! Added ${pkg.credits} credits for ₹${pkg.priceRs}. Total balance: ${verifyData.credits} credits.`,
            });
          } catch (verifyErr) {
            setCreditStatus({
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
        throw new Error("Razorpay SDK not loaded. Please refresh page and try again.");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setCreditStatus({
          type: "error",
          message: `Payment failed: ${response.error?.description || "Transaction failed"}`,
        });
        setPurchasingKey(null);
      });
      rzp.open();
    } catch (err) {
      setCreditStatus({ type: "error", message: err.message || "Unable to initiate payment." });
      setPurchasingKey(null);
    }
  };

  const initial = (name || userProfile?.email || "U").charAt(0).toUpperCase();

  return (
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 6 }}>
      <PageHeader
        title="My profile"
        subtitle="Keep your details current for recruiter-facing evaluations."
        onBack={onBack}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: { xs: 2, sm: 3 },
          alignItems: "start",
        }}
      >
        {/* ---------- Identity card ---------- */}
        <Reveal direction="left">
          <GlassCard glow sx={{ p: { xs: 2.5, sm: 3 }, textAlign: "center" }}>
            <Avatar
              src={currentUser?.photoURL || undefined}
              sx={{
                width: 92,
                height: 92,
                mx: "auto",
                mb: 2,
                fontSize: "2.4rem",
                background: theme.ll.gradientPrimary,
                color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
                boxShadow: theme.ll.glow.primary,
                transition: "transform .4s cubic-bezier(.22,1,.36,1)",
                "&:hover": { transform: "scale(1.06) rotate(-4deg)" },
              }}
            >
              {initial}
            </Avatar>

            <Typography variant="h6" noWrap>
              {name || "User profile"}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
              {userProfile?.email}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="overline" color="text.secondary">
              Available credits
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "2.8rem",
                lineHeight: 1.1,
                background: theme.ll.gradientPrimary,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <AnimatedNumber value={Number(credits) || 0} />
            </Typography>

            {location ? (
              <Chip
                icon={<PlaceRoundedIcon />}
                label={location}
                size="small"
                variant="outlined"
                sx={{ mt: 1.5 }}
              />
            ) : null}
          </GlassCard>
        </Reveal>

        {/* ---------- Main column ---------- */}
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {/* Edit profile */}
          <Reveal direction="right" delay={70}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
              <SectionHeading
                icon={<PersonRoundedIcon />}
                title="Edit profile"
                subtitle="These details personalise your dashboard and reports."
              />

              <Box component="form" onSubmit={handleSubmit}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Date of birth"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CakeRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age"
                    fullWidth
                    slotProps={{
                      htmlInput: { min: 0, max: 120 },
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <NumbersRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PlaceRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                <TextField
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself — DSA interests, target companies, goals…"
                  multiline
                  minRows={3}
                  fullWidth
                  sx={{ mt: 2 }}
                />

                <Collapse in={Boolean(status.message)}>
                  <Alert
                    severity={status.type === "success" ? "success" : "error"}
                    sx={{ mt: 2, animation: "ll-pop-in .35s cubic-bezier(.22,1,.36,1)" }}
                    onClose={() => setStatus({ type: "", message: "" })}
                  >
                    {status.message}
                  </Alert>
                </Collapse>

                <PulseButton
                  type="submit"
                  size="large"
                  disabled={loading}
                  startIcon={!loading ? <SaveRoundedIcon /> : null}
                  gradient={theme.ll.gradientPrimary}
                  sx={{ mt: 2.5, width: { xs: "100%", sm: "auto" }, minWidth: 200 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Save changes"}
                </PulseButton>
              </Box>
            </GlassCard>
          </Reveal>

          {/* Buy credits */}
          <Reveal delay={120}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
              <SectionHeading
                icon={<ShoppingCartRoundedIcon />}
                title="Purchase credits"
                subtitle="Top up instantly with Razorpay checkout."
              />

              <Collapse in={Boolean(creditStatus.message)}>
                <Alert
                  severity={creditStatus.type === "success" ? "success" : "error"}
                  sx={{ mb: 2 }}
                  onClose={() => setCreditStatus({ type: "", message: "" })}
                >
                  {creditStatus.message}
                </Alert>
              </Collapse>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(210px, 1fr))" },
                  gap: 2,
                }}
              >
                {PURCHASE_PACKAGES.map((pkg, index) => {
                  const isBuying = purchasingKey === pkg.key;
                  const highlighted = Boolean(pkg.badge);
                  const accent = highlighted ? theme.palette.primary.main : theme.palette.info.main;

                  return (
                    <Grow in timeout={460 + index * 120} key={pkg.key}>
                      <Box
                        sx={{
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          p: 2.25,
                          pt: highlighted ? 3 : 2.25,
                          borderRadius: 4,
                          background: alpha(accent, highlighted ? 0.1 : 0.05),
                          border: `1px solid ${alpha(accent, highlighted ? 0.4 : 0.2)}`,
                          transition: "transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease",
                          "&:hover": {
                            transform: "translateY(-5px)",
                            boxShadow: `0 16px 40px ${alpha(accent, 0.26)}`,
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
                              fontSize: "0.6rem",
                              height: 21,
                              fontWeight: 800,
                              background: theme.ll.gradientPrimary,
                              color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
                            }}
                          />
                        ) : null}

                        <Typography variant="subtitle2">{pkg.name}</Typography>
                        <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.2 }}>
                          ₹{pkg.priceRs}
                        </Typography>
                        <Typography variant="caption" sx={{ color: accent, fontWeight: 700, mb: 1.5 }}>
                          {pkg.credits} credits · {pkg.perCredit}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ flexGrow: 1, mb: 2, lineHeight: 1.55, fontSize: "0.82rem" }}
                        >
                          {pkg.description}
                        </Typography>

                        <PulseButton
                          fullWidth
                          size="small"
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
                            <CircularProgress size={18} color="inherit" />
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

          {/* Security */}
          <Reveal delay={170}>
            <GlassCard interactive={false} sx={{ p: { xs: 2, sm: 3 } }}>
              <SectionHeading
                icon={<ShieldRoundedIcon />}
                accent={theme.palette.warning.main}
                title="Security"
                subtitle="Change the password used to sign in."
              />

              {isGoogleUser ? (
                <Alert severity="info" icon={<ShieldRoundedIcon />}>
                  Your account is authenticated with Google, so password changes are managed
                  through your Google account.
                </Alert>
              ) : (
                <Box component="form" onSubmit={handlePasswordChange}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="New password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                edge="end"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label="Toggle password visibility"
                              >
                                {showPassword ? (
                                  <VisibilityOffRoundedIcon fontSize="small" />
                                ) : (
                                  <VisibilityRoundedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <TextField
                      label="Confirm password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      fullWidth
                      error={Boolean(confirmPassword) && confirmPassword !== newPassword}
                      helperText={
                        confirmPassword && confirmPassword !== newPassword
                          ? "Passwords do not match"
                          : " "
                      }
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Box>

                  <Collapse in={Boolean(pwdStatus.message)}>
                    <Alert
                      severity={pwdStatus.type === "success" ? "success" : "error"}
                      sx={{ mt: 1 }}
                      onClose={() => setPwdStatus({ type: "", message: "" })}
                    >
                      {pwdStatus.message}
                    </Alert>
                  </Collapse>

                  <PulseButton
                    type="submit"
                    disabled={pwdLoading}
                    gradient={`linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.secondary.main})`}
                    sx={{ mt: 2, width: { xs: "100%", sm: "auto" }, minWidth: 200 }}
                  >
                    {pwdLoading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      "Update password"
                    )}
                  </PulseButton>
                </Box>
              )}
            </GlassCard>
          </Reveal>
        </Stack>
      </Box>
    </Box>
  );
}
