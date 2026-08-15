import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";

import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu({
  onLogin,
  onProfileClick,
  onCreditsClick,
  onHistoryClick,
  onResumeClick,
  theme: mode,
  onToggleTheme,
}) {
  const { currentUser, userProfile, credits, signOut } = useAuth();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);
  const run = (fn) => () => {
    close();
    fn?.();
  };

  if (!currentUser) {
    return (
      <Button
        variant="contained"
        color="primary"
        size={isCompact ? "small" : "medium"}
        startIcon={<LoginRoundedIcon />}
        onClick={onLogin}
      >
        Log in
      </Button>
    );
  }

  const greetingName = userProfile?.name || currentUser.displayName || "";
  const initialChar = (greetingName || currentUser.email || "U").charAt(0).toUpperCase();

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          pl: 0.6,
          pr: { xs: 0.6, sm: 1.4 },
          py: 0.6,
          minWidth: 0,
          borderRadius: 999,
          color: "text.primary",
          border: `1px solid ${theme.ll.border}`,
          bgcolor: alpha(theme.palette.background.paper, 0.55),
          backdropFilter: "blur(10px)",
          "&:hover": { borderColor: alpha(theme.palette.primary.main, 0.5) },
        }}
      >
        <Avatar
          src={currentUser.photoURL || undefined}
          sx={{
            width: 30,
            height: 30,
            fontSize: "0.85rem",
            background: theme.ll.gradientPrimary,
            color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
          }}
        >
          {initialChar}
        </Avatar>
        <Box
          component="span"
          sx={{
            display: { xs: "none", sm: "block" },
            ml: 1,
            maxWidth: 132,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "0.86rem",
          }}
        >
          {greetingName || "Account"}
        </Box>
        <KeyboardArrowDownRoundedIcon
          sx={{
            display: { xs: "none", sm: "block" },
            ml: 0.4,
            fontSize: 18,
            transition: "transform .28s cubic-bezier(.22,1,.36,1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 268, overflow: "visible" } } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Avatar
              src={currentUser.photoURL || undefined}
              sx={{
                width: 40,
                height: 40,
                background: theme.ll.gradientPrimary,
                color: theme.palette.mode === "dark" ? "#04121c" : "#fff",
              }}
            >
              {initialChar}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }} noWrap>
                {greetingName || "LeetLens user"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ mb: 0.5 }} />

        <MenuItem onClick={run(onProfileClick)}>
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          My profile
        </MenuItem>

        <MenuItem onClick={run(onCreditsClick)}>
          <ListItemIcon>
            <TokenRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
            Credits
            <Chip label={credits} size="small" color="primary" sx={{ height: 20, fontSize: "0.7rem" }} />
          </Box>
        </MenuItem>

        <MenuItem onClick={run(onHistoryClick)}>
          <ListItemIcon>
            <HistoryRoundedIcon fontSize="small" />
          </ListItemIcon>
          Evaluation history
        </MenuItem>

        <MenuItem onClick={run(onResumeClick)}>
          <ListItemIcon>
            <DescriptionRoundedIcon fontSize="small" />
          </ListItemIcon>
          Resume analyzer
        </MenuItem>

        {onToggleTheme ? (
          <MenuItem onClick={() => onToggleTheme()}>
            <ListItemIcon>
              {mode === "dark" ? (
                <LightModeRoundedIcon fontSize="small" />
              ) : (
                <DarkModeRoundedIcon fontSize="small" />
              )}
            </ListItemIcon>
            {mode === "dark" ? "Switch to light" : "Switch to dark"}
          </MenuItem>
        ) : null}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={async () => {
            close();
            await signOut();
          }}
          sx={{ color: "error.main", "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.12) } }}
        >
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
