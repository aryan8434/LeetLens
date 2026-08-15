import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import { useAuth } from "../contexts/AuthContext";
import { BrandMark, GlassCard, PulseButton, Reveal } from "./ui";

function getReadableAuthError(error) {
  if (!error) return "Authentication failed.";
  const code = error.code;
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address. Please check and try again.";
    case "auth/user-not-found":
      return "User does not exist. Please check your email or sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "This email is already in use. Please log in.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please recheck.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed. Please try again.";
    default:
      return error.message?.replace(/^Firebase:\s*/, "") || "Authentication failed.";
  }
}

function GoogleGlyph() {
  return (
    <Box component="svg" width={19} height={19} viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.505.453 3.44 1.346l2.582-2.58C13.463 1.077 11.427 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </Box>
  );
}

export default function AuthPage({ onBackToLanding, onAuthSuccess }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let credential;
      if (mode === "login") {
        credential = await signIn(email, password);
      } else {
        credential = await signUp(email, password);
      }
      onAuthSuccess?.(credential?.user);
    } catch (authError) {
      setError(getReadableAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithGoogle();
      onAuthSuccess?.(credential?.user);
    } catch (authError) {
      setError(getReadableAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 468 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onBackToLanding}
          sx={{ color: "text.secondary", mb: 2 }}
        >
          Back
        </Button>

        <Reveal>
          <GlassCard interactive={false} glow sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={1.25} sx={{ alignItems: "center", mb: 3 }}>
              <Box sx={{ animation: "ll-float 5s ease-in-out infinite" }}>
                <BrandMark size={44} showWordmark={false} />
              </Box>
              <Typography variant="h5" sx={{ textAlign: "center" }}>
                {mode === "login" ? "Welcome back" : "Create your account"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", maxWidth: 320 }}
              >
                {mode === "login"
                  ? "Access your dashboard, saved reports and credits."
                  : "Analyze your LeetCode profile and resume with AI evaluations."}
              </Typography>
            </Stack>

            <Tabs
              value={mode}
              onChange={(_, value) => {
                setMode(value);
                setError("");
              }}
              variant="fullWidth"
              sx={{
                mb: 3,
                p: 0.5,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.07),
                border: `1px solid ${theme.ll.border}`,
                minHeight: 44,
                "& .MuiTabs-indicator": { display: "none" },
                "& .Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                  color: "primary.main",
                },
              }}
            >
              <Tab value="login" label="Sign in" sx={{ minHeight: 38, borderRadius: 2 }} />
              <Tab value="signup" label="Sign up" sx={{ minHeight: 38, borderRadius: 2 }} />
            </Tabs>

            <Collapse in={Boolean(error)}>
              <Alert
                severity="error"
                sx={{ mb: 2, animation: "ll-pop-in .35s cubic-bezier(.22,1,.36,1)" }}
                onClose={() => setError("")}
              >
                {error}
              </Alert>
            </Collapse>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlineRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  fullWidth
                  helperText={mode === "signup" ? "At least 6 characters" : " "}
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
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
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

                <PulseButton
                  type="submit"
                  size="large"
                  fullWidth
                  disabled={loading}
                  gradient={theme.ll.gradientPrimary}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : mode === "login" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </PulseButton>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.disabled">
                or continue with
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleGlyph />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{ color: "text.primary" }}
            >
              Google
            </Button>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 3 }}
            >
              {mode === "login" ? "New to LeetLens? " : "Already have an account? "}
              <Box
                component="span"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {mode === "login" ? "Sign up instead" : "Sign in instead"}
              </Box>
            </Typography>
          </GlassCard>
        </Reveal>
      </Box>
    </Box>
  );
}
