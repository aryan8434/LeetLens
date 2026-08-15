import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { BrandMark } from "./ui";

// iOS can't do the "swipe from the edge to open" gesture well; MUI recommends
// disabling its discovery affordance there.
const iOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * YouTube-style navigation drawer: slides in from the left over a scrim,
 * swipeable on touch devices, with the account card pinned to the top.
 */
export default function AppNavDrawer({
  open,
  onOpen,
  onClose,
  view,
  onNavigate,
  currentUser,
  userProfile,
  credits,
  mode,
  onToggleTheme,
  onLogin,
  onSignOut,
}) {
  const theme = useTheme();

  const go = (target) => () => {
    onNavigate(target);
    onClose();
  };

  const primaryItems = [
    { key: "home", label: "Dashboard", icon: <HomeRoundedIcon />, always: true },
    // Anonymous visitors get a free resume evaluation, so this stays visible.
    { key: "resume", label: "Resume analyzer", icon: <DescriptionRoundedIcon />, always: true },
    { key: "history", label: "Evaluation history", icon: <HistoryRoundedIcon /> },
    {
      key: "credits",
      label: "Credits",
      icon: <TokenRoundedIcon />,
      badge: currentUser ? String(credits) : null,
    },
    { key: "profile", label: "My profile", icon: <PersonRoundedIcon /> },
  ];

  const visibleItems = primaryItems.filter((item) => item.always || currentUser);
  const initial = (userProfile?.name || currentUser?.displayName || currentUser?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableBackdropTransition={!iOS}
      disableDiscovery={iOS}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "82vw", sm: 312 },
            maxWidth: 340,
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1.5,
          py: 1.5,
          borderBottom: `1px solid ${theme.ll.border}`,
          position: "sticky",
          top: 0,
          zIndex: 2,
          backdropFilter: "blur(12px)", }}>
        <IconButton onClick={onClose} aria-label="Close navigation" size="small">
          <CloseRoundedIcon />
        </IconButton>
        <BrandMark size={26} onClick={go(currentUser ? "home" : "landing")} />
      </Stack>

      <Box sx={{ p: 1.5, overflowY: "auto", flex: 1 }}>
        {/* Account card */}
        {currentUser ? (
          <Box
            onClick={go("profile")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              mb: 1.5,
              borderRadius: 3,
              cursor: "pointer",
              background: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              transition: "transform .25s cubic-bezier(.22,1,.36,1), background-color .25s ease",
              "&:hover": { background: alpha(theme.palette.primary.main, 0.14) },
              "&:active": { transform: "scale(0.985)" },
            }}
          >
            <Avatar
              src={currentUser.photoURL || undefined}
              sx={{
                width: 44,
                height: 44,
                background: theme.ll.gradientPrimary,
                color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }} noWrap>
                {userProfile?.name || currentUser.displayName || "LeetLens user"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              mb: 1.5,
              borderRadius: 3,
              textAlign: "center",
              background: alpha(theme.palette.primary.main, 0.07),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Sign in to unlock full LeetCode insights, saved reports and credits.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                onLogin();
                onClose();
              }}
            >
              Log in / Register
            </Button>
          </Box>
        )}

        {/* Primary nav */}
        <List sx={{ py: 0 }}>
          {visibleItems.map((item, index) => (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={view === item.key}
                onClick={go(item.key === "home" && !currentUser ? "landing" : item.key)}
                sx={{
                  py: 1.15,
                  animation: open ? "ll-fade-up .42s cubic-bezier(.22,1,.36,1) both" : "none",
                  animationDelay: `${index * 45}ms`,
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 40, color: view === item.key ? "primary.main" : "text.secondary" }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: { fontWeight: view === item.key ? 800 : 600, fontSize: "0.94rem" },
                    },
                  }}
                />
                {item.badge ? (
                  <Chip
                    label={item.badge}
                    size="small"
                    color="primary"
                    sx={{ height: 21, fontSize: "0.7rem" }}
                  />
                ) : null}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 1.5 }} />

        <List sx={{ py: 0 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton onClick={onToggleTheme} sx={{ py: 1.15 }}>
              <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
                {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </ListItemIcon>
              <ListItemText
                primary={mode === "dark" ? "Light appearance" : "Dark appearance"}
                slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.94rem" } } }}
              />
            </ListItemButton>
          </ListItem>

          {currentUser ? (
            <ListItem disablePadding>
              <ListItemButton
                onClick={async () => {
                  onClose();
                  await onSignOut();
                }}
                sx={{
                  py: 1.15,
                  color: "error.main",
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.1) },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
                  <LogoutRoundedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Sign out"
                  slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.94rem" } } }}
                />
              </ListItemButton>
            </ListItem>
          ) : null}
        </List>
      </Box>

      <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${theme.ll.border}` }}>
        <Typography variant="caption" color="text.disabled">
          LeetLens · AI-powered interview readiness
        </Typography>
      </Box>
    </SwipeableDrawer>
  );
}
