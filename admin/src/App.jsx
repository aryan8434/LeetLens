import React, { useState, useEffect } from "react";
import {
  Users,
  Activity,
  Folder,
  ChevronRight,
  ArrowLeft,
  Search,
  Shield,
  LayoutDashboard,
  BarChart3,
  Monitor,
  Smartphone,
  Loader2,
  PieChart,
} from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  collectionGroup,
  getCountFromServer,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from "@mui/material";

// Create custom Material UI Theme matching the LeetLens dark/indigo aesthetic
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#8b5cf6", // Indigo/Purple
      glow: "rgba(139, 92, 246, 0.4)",
    },
    secondary: {
      main: "#06b6d4", // Cyan/Teal
    },
    background: {
      default: "#0f172a",
      paper: "rgba(30, 41, 59, 0.6)",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: '"Inter", "Montserrat", "Segoe UI", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          background: radial-gradient(circle at top right, #1e1b4b, #0f172a 60%) !important;
          background-attachment: fixed !important;
          font-family: "Inter", sans-serif;
          min-height: 100vh;
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "rgba(30, 41, 59, 0.5)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
          transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            borderColor: "rgba(139, 92, 246, 0.4)",
            boxShadow: "0 14px 35px rgba(139, 92, 246, 0.15)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "rgba(30, 41, 59, 0.55)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#f8fafc",
          padding: "16px",
        },
        head: {
          background: "rgba(15, 23, 42, 0.8)",
          color: "#94a3b8",
          fontWeight: 600,
          textTransform: "uppercase",
          fontSize: "0.75rem",
          letterSpacing: "0.5px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 16px",
          transition: "all 0.2s ease",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: "#1e293b",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
        },
      },
    },
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalSearches, setTotalSearches] = useState(0);
  const [dailyFolders, setDailyFolders] = useState([]);

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderVisitors, setFolderVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [editingCreditsValue, setEditingCreditsValue] = useState(0);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearches, setUserSearches] = useState([]);
  const [loadingUserSearches, setLoadingUserSearches] = useState(false);
  const [selectedReportText, setSelectedReportText] = useState(null);

  const [unregisteredVisits, setUnregisteredVisits] = useState([]);
  const [userVisits, setUserVisits] = useState([]);

  const [expandedUnregRows, setExpandedUnregRows] = useState(new Set());
  const [unregResumesMap, setUnregResumesMap] = useState({});
  const [userResumes, setUserResumes] = useState([]);

  const totalUnregisteredVisits = unregisteredVisits.length;
  const unregisteredIpCounts = unregisteredVisits.reduce((counts, visit) => {
    const ip = (visit.ipAddress || "unknown").toString().trim() || "unknown";
    counts[ip] = (counts[ip] || 0) + 1;
    return counts;
  }, {});
  const sortedUnregisteredIpCounts = Object.entries(unregisteredIpCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const visitorsQuery = collectionGroup(db, "visitors");
        const visitorsSnapshot = await getCountFromServer(visitorsQuery);
        setTotalVisitors(visitorsSnapshot.data().count);

        const searchesQuery = collectionGroup(db, "searches");
        const searchesSnapshot = await getCountFromServer(searchesQuery);
        setTotalSearches(searchesSnapshot.data().count);

        const foldersSnapshot = await getDocs(collection(db, "user_searches"));
        const folders = [];
        foldersSnapshot.forEach((doc) => {
          folders.push(doc.id);
        });

        setDailyFolders(folders.reverse());

        const regUsersSnapshot = await getDocs(
          collection(db, "registered_users"),
        );
        const regUsers = [];
        regUsersSnapshot.forEach((doc) => {
          regUsers.push({ id: doc.id, ...doc.data() });
        });
        setRegisteredUsers(
          regUsers.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          ),
        );

        const unregSnapshot = await getDocs(
          collection(db, "unregistered_visits"),
        );
        const unreg = [];
        unregSnapshot.forEach((doc) => {
          unreg.push({ id: doc.id, ...doc.data() });
        });
        setUnregisteredVisits(
          unreg.sort(
            (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
          ),
        );
      } catch (err) {
        console.error("Failed to load metrics:", err);
        setErrorMsg("Failed to load metrics. See console for details.");
      }
    };
    fetchMetrics();
  }, []);

  const toggleUnregExpand = async (visitId) => {
    const newExpanded = new Set(expandedUnregRows);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
      if (!unregResumesMap[visitId]) {
        try {
          const resumesSnap = await getDocs(
            collection(db, "unregistered_visits", visitId, "resumes"),
          );
          const list = [];
          resumesSnap.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
          setUnregResumesMap((prev) => ({
            ...prev,
            [visitId]: list.sort(
              (a, b) =>
                (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
            ),
          }));
        } catch (e) {
          console.error("Failed to load resumes for unregistered visit:", e);
        }
      }
    }
    setExpandedUnregRows(newExpanded);
  };

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setEditingCreditsValue(user.credits || 0);
    setLoadingUserSearches(true);
    setErrorMsg(null);
    setUserSearches([]);
    setUserVisits([]);
    setUserResumes([]);

    try {
      const searchesSnapshot = await getDocs(
        collection(db, "registered_users", user.id, "searches"),
      );
      const s = [];
      searchesSnapshot.forEach((docSnap) => {
        s.push({ id: docSnap.id, ...docSnap.data() });
      });

      setUserSearches(
        s.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
        ),
      );

      const visitsSnapshot = await getDocs(
        collection(db, "registered_users", user.id, "visit_history"),
      );
      const v = [];
      visitsSnapshot.forEach((docSnap) => {
        v.push({ id: docSnap.id, ...docSnap.data() });
      });

      setUserVisits(
        v.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
        ),
      );

      const resumesSnapshot = await getDocs(
        collection(db, "registered_users", user.id, "resumes"),
      );
      const r = [];
      resumesSnapshot.forEach((docSnap) => {
        r.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUserResumes(
        r.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
        ),
      );
    } catch (err) {
      console.error("Failed to load user logs:", err);
      setErrorMsg(
        "Failed to load user searches and visits history. See console for details.",
      );
    } finally {
      setLoadingUserSearches(false);
    }
  };

  const openFolder = async (folderId) => {
    setLoading(true);
    setSelectedFolder(folderId);
    setExpandedRows(new Set());
    setActiveTab("folders");
    setErrorMsg(null);

    try {
      const vSnapshot = await getDocs(
        collection(db, "user_searches", folderId, "visitors"),
      );
      const visitors = [];

      for (const docSnap of vSnapshot.docs) {
        const vData = docSnap.data();

        const searchesSnapshot = await getDocs(
          collection(
            db,
            "user_searches",
            folderId,
            "visitors",
            docSnap.id,
            "searches",
          ),
        );
        const s = [];
        searchesSnapshot.forEach((sDoc) => {
          s.push({ id: sDoc.id, ...sDoc.data() });
        });

        visitors.push({
          id: docSnap.id,
          ...vData,
          searchesList: s.sort(
            (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
          ),
        });
      }

      setFolderVisitors(
        visitors.sort(
          (a, b) =>
            (b.last_visited_at?.seconds || 0) -
            (a.last_visited_at?.seconds || 0),
        ),
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(
        `Failed to load details for ${folderId}. Check console for error.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (visitorId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(visitorId)) {
      newExpanded.delete(visitorId);
    } else {
      newExpanded.add(visitorId);
    }
    setExpandedRows(newExpanded);
  };

  const saveCredits = async (userId) => {
    const newCredits = Number(editingCreditsValue || 0);
    if (Number.isNaN(newCredits) || newCredits < 0)
      return alert("Please enter a valid non-negative number");

    setUpdateLoading(true);
    try {
      await updateDoc(doc(db, "registered_users", userId), {
        credits: newCredits,
      });

      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, credits: newCredits } : u)),
      );
      setSelectedUser((prev) =>
        prev ? { ...prev, credits: newCredits } : null,
      );
      alert("Credits updated successfully!");
    } catch (err) {
      console.error("Failed to update credits:", err);
      alert("Failed to update credits. See console for details.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUserFromDetails = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user's records from the database? This action cannot be undone.",
      )
    ) {
      return;
    }

    setUpdateLoading(true);
    try {
      await deleteDoc(doc(db, "registered_users", userId));

      setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setUserSearches([]);
      alert("User records deleted successfully from database!");
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user: " + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // --- MATERIAL UI RENDER BLOCKS ---

  const renderOverview = () => (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          letterSpacing="-0.5px"
          gutterBottom
        >
          Dashboard Overview
        </Typography>
        <Typography color="text.secondary">
          Real-time metrics from your LeetLens deployment.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  variant="subtitle2"
                >
                  Total Unique Visitors
                </Typography>
                <Users size={20} color="#8b5cf6" />
              </Box>
              <Typography variant="h2" fontWeight={800}>
                {totalVisitors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  variant="subtitle2"
                >
                  Total Searches Processed
                </Typography>
                <Activity size={20} color="#06b6d4" />
              </Box>
              <Typography variant="h2" fontWeight={800}>
                {totalSearches}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  variant="subtitle2"
                >
                  Total Unregistered Visits
                </Typography>
                <BarChart3 size={20} color="#f59e0b" />
              </Box>
              <Typography variant="h2" fontWeight={800}>
                {totalUnregisteredVisits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Folder size={22} color="#8b5cf6" />
        <Typography variant="h6" fontWeight={700}>
          Daily Tracking Folders
        </Typography>
      </Box>

      {dailyFolders.length === 0 ? (
        <Typography color="text.secondary">
          No daily logs generated yet.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {dailyFolders.map((folderName) => (
            <Grid item xs={12} sm={6} md={3} key={folderName}>
              <Card
                sx={{
                  cursor: "pointer",
                  textAlign: "center",
                  py: 3,
                  px: 2,
                  "&:hover": {
                    borderColor: "#8b5cf6",
                    background: "rgba(139, 92, 246, 0.08)",
                  },
                }}
                onClick={() => openFolder(folderName)}
              >
                <Folder
                  size={36}
                  style={{ color: "#8b5cf6", marginBottom: "8px" }}
                />
                <Typography variant="subtitle1" fontWeight={700}>
                  {folderName}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderFolderDetails = () => (
    <Box>
      <Button
        variant="text"
        startIcon={<ArrowLeft size={16} />}
        onClick={() => {
          setSelectedFolder(null);
          setActiveTab("overview");
          setErrorMsg(null);
        }}
        sx={{
          mb: 2,
          color: "text.secondary",
          "&:hover": { color: "text.primary" },
        }}
      >
        Back to Overview
      </Button>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {selectedFolder}
        </Typography>
        <Typography color="text.secondary">
          Visitor logs and search details for this specific day.
        </Typography>
        {errorMsg && (
          <Typography color="error.light" sx={{ mt: 1 }}>
            {errorMsg}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress size={40} thickness={4} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Fetching nested logs...
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>IP Address</TableCell>
                <TableCell>Device</TableCell>
                <TableCell>OS & Browser</TableCell>
                <TableCell>First Seen At</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {folderVisitors.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    No visitors logged for this day.
                  </TableCell>
                </TableRow>
              )}
              {folderVisitors.map((visitor) => {
                const dateVal = visitor.last_visited_at?.toDate();
                const isExpanded = expandedRows.has(visitor.id);

                return (
                  <React.Fragment key={visitor.id}>
                    <TableRow hover>
                      <TableCell
                        sx={{
                          fontFamily: "monospace",
                          color: "#8b5cf6",
                          fontWeight: 600,
                        }}
                      >
                        {visitor.ip || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: "20px",
                            fontSize: "0.8rem",
                            background: "rgba(6, 182, 212, 0.1)",
                            color: "#06b6d4",
                            border: "1px solid rgba(6, 182, 212, 0.2)",
                          }}
                        >
                          {visitor.device?.type === "mobile" ? (
                            <Smartphone size={12} style={{ marginRight: 6 }} />
                          ) : (
                            <Monitor size={12} style={{ marginRight: 6 }} />
                          )}
                          {visitor.device?.vendor} {visitor.device?.model}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          color="text.primary"
                        >
                          {visitor.device?.os}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visitor.device?.browser}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {dateVal ? dateVal.toLocaleTimeString() : "--"}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => toggleExpand(visitor.id)}
                          endIcon={
                            <ChevronRight
                              size={14}
                              style={{
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "none",
                                transition: "transform 0.2s",
                              }}
                            />
                          }
                        >
                          {visitor.searchesList?.length || 0} Searches
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={5}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              p: 2,
                              background: "rgba(0, 0, 0, 0.15)",
                              borderRadius: "8px",
                              m: 1.5,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{
                                mb: 1.5,
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              Nested Search Lookups
                            </Typography>
                            {visitor.searchesList?.length === 0 ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                No searches performed yet.
                              </Typography>
                            ) : (
                              <Grid container spacing={1.5}>
                                {visitor.searchesList.map((search) => (
                                  <Grid item xs={12} sm={6} key={search.id}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        p: 1.5,
                                        background: "#0f172a",
                                        border:
                                          "1px solid rgba(255, 255, 255, 0.05)",
                                        borderRadius: "8px",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Search
                                          size={14}
                                          style={{ color: "#8b5cf6" }}
                                        />
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                        >
                                          {search.username}
                                        </Typography>
                                      </Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {search.timestamp
                                          ?.toDate()
                                          ?.toLocaleTimeString()}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderRegisteredUsers = () => (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          letterSpacing="-0.5px"
          gutterBottom
        >
          Registered Users
        </Typography>
        <Typography color="text.secondary">
          List of all users signed up on LeetLens.
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Photo</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Coordinates</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {registeredUsers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  No registered users found.
                </TableCell>
              </TableRow>
            )}
            {registeredUsers.map((user) => {
              const dateVal = user.createdAt?.toDate();

              return (
                <TableRow hover key={user.id}>
                  <TableCell>
                    {user.photo && user.photo.startsWith("data:image") ? (
                      <Avatar
                        src={user.photo}
                        sx={{
                          width: 36,
                          height: 36,
                          border: "1.5px solid #8b5cf6",
                        }}
                      />
                    ) : (
                      <Avatar sx={{ width: 36, height: 36 }}>--</Avatar>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "#8b5cf6", fontWeight: 600 }}>
                    {user.email || "No Email"}
                  </TableCell>
                  <TableCell>{user.name || "--"}</TableCell>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: "rgba(139, 92, 246, 0.12)",
                        color: "#8b5cf6",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                      }}
                    >
                      {user.credits} Credits
                    </Box>
                  </TableCell>
                  <TableCell>{user.location || "--"}</TableCell>
                  <TableCell>{user.coordinates || "--"}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {user.ipAddress || "--"}
                  </TableCell>
                  <TableCell>
                    {dateVal
                      ? dateVal.toLocaleDateString() +
                        " " +
                        dateVal.toLocaleTimeString()
                      : "--"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => openUserDetails(user)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderUserDetails = () => {
    if (!selectedUser) return null;

    const dateVal = selectedUser.createdAt?.toDate();
    const profileSearches = userSearches.filter(
      (s) => s.type === "analysis" || !s.type,
    );
    const aiReports = userSearches.filter((s) => s.type === "ai_report");

    return (
      <Box>
        <Button
          variant="text"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => {
            setSelectedUser(null);
            setUserSearches([]);
            setErrorMsg(null);
          }}
          sx={{
            mb: 2,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          Back to Registered Users
        </Button>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            User Profile: {selectedUser.name || "Unnamed User"}
          </Typography>
          <Typography color="text.secondary">
            Manage credits, deletion, and view search/evaluation history for
            this account.
          </Typography>
          {errorMsg && (
            <Typography color="error.light" sx={{ mt: 1 }}>
              {errorMsg}
            </Typography>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Column 1: Profile Summary */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                Profile Summary
              </Typography>
              {selectedUser.photo &&
                selectedUser.photo.startsWith("data:image") && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 3 }}
                  >
                    <Avatar
                      src={selectedUser.photo}
                      sx={{
                        width: 90,
                        height: 90,
                        border: "3px solid #8b5cf6",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                      }}
                    />
                  </Box>
                )}
              <List disablePadding sx={{ flexGrow: 1 }}>
                {[
                  { label: "Email", val: selectedUser.email, isAcc: true },
                  { label: "Name", val: selectedUser.name || "--" },
                  { label: "Age", val: selectedUser.age || "--" },
                  { label: "DOB", val: selectedUser.dob || "--" },
                  { label: "Location", val: selectedUser.location || "--" },
                  {
                    label: "Coordinates",
                    val: selectedUser.coordinates || "--",
                  },
                  { label: "Bio", val: selectedUser.bio || "--", isBio: true },
                  {
                    label: "Registered IP",
                    val: selectedUser.ipAddress || "--",
                    isCode: true,
                  },
                  {
                    label: "Registered At",
                    val: dateVal
                      ? dateVal.toLocaleDateString() +
                        " " +
                        dateVal.toLocaleTimeString()
                      : "--",
                  },
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    {idx > 0 && (
                      <Divider
                        sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.06)" }}
                      />
                    )}
                    <ListItem
                      disablePadding
                      sx={{ flexDirection: "column", alignItems: "flex-start" }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{ textTransform: "uppercase", mb: 0.5 }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        color={item.isAcc ? "#8b5cf6" : "text.primary"}
                        fontWeight={item.isAcc ? 600 : 400}
                        sx={{
                          wordBreak: "break-all",
                          fontFamily: item.isCode ? "monospace" : "inherit",
                          fontStyle: item.isBio ? "italic" : "normal",
                        }}
                      >
                        {item.val}
                      </Typography>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Grid>

          {/* Column 2: Uploaded Resumes */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Uploaded Resumes
              </Typography>
              {userResumes.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", flexGrow: 1 }}
                >
                  No resumes uploaded yet.
                </Typography>
              ) : (
                <List
                  disablePadding
                  sx={{ overflowY: "auto", flexGrow: 1, maxHeight: 450 }}
                >
                  {userResumes.map((resDoc, idx) => (
                    <React.Fragment key={resDoc.id}>
                      {idx > 0 && (
                        <Divider
                          sx={{
                            my: 1.5,
                            borderColor: "rgba(255,255,255,0.06)",
                          }}
                        />
                      )}
                      <ListItem
                        disablePadding
                        sx={{
                          flexDirection: "column",
                          alignItems: "flex-start",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          color="#8b5cf6"
                          sx={{
                            width: "100%",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {resDoc.fileName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          Uploaded:{" "}
                          {resDoc.timestamp?.toDate()?.toLocaleString() ||
                            "Unknown"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            onClick={() =>
                              setSelectedReportText(
                                `RESUME CONTENT:\n\n${resDoc.content}`,
                              )
                            }
                            sx={{ fontSize: "0.75rem", py: 0.5 }}
                          >
                            Resume
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => setSelectedReportText(resDoc.report)}
                            sx={{ fontSize: "0.75rem", py: 0.5 }}
                          >
                            Report
                          </Button>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Card>
          </Grid>

          {/* Column 3: Edit Credits & Danger Zone */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                height: "100%",
              }}
            >
              <Card sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Edit Credits
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <TextField
                    type="number"
                    size="small"
                    value={editingCreditsValue}
                    onChange={(e) =>
                      setEditingCreditsValue(Number(e.target.value))
                    }
                    disabled={updateLoading}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => saveCredits(selectedUser.id)}
                    disabled={updateLoading}
                  >
                    {updateLoading ? "Saving..." : "Save"}
                  </Button>
                </Box>
              </Card>

              <Card
                sx={{
                  p: 3,
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  "&:hover": { borderColor: "#ef4444" },
                  flexGrow: 1,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color="error.light"
                  sx={{ mb: 1 }}
                >
                  Danger Zone
                </Typography>
                <Typography
                  variant="body2"
                  color="error.light"
                  sx={{ mb: 2, opacity: 0.85, fontSize: "0.82rem" }}
                >
                  This permanently deletes the user's database record, resetting
                  all credits and logs.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={() => handleDeleteUserFromDetails(selectedUser.id)}
                  disabled={updateLoading}
                >
                  Delete User Records
                </Button>
              </Card>
            </Box>
          </Grid>

          {/* Row 2: User Activity Log - Full Width */}
          <Grid item xs={12}>
            <Paper sx={{ p: 4, minHeight: "100%" }}>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 4 }}>
                User Activity Log
              </Typography>

              {loadingUserSearches ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, py: 4 }}
                >
                  <CircularProgress size={24} />
                  <Typography color="text.secondary">
                    Loading activity logs...
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {/* Column 1: Profile Searches */}
                  <Grid item xs={12} lg={4}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        mb: 2,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        pb: 1,
                      }}
                    >
                      Profile Searches ({profileSearches.length})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
                      {profileSearches.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          No profile searches logged yet.
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          {profileSearches.map((log) => {
                            const logTime = log.timestamp?.toDate();
                            return (
                              <Box
                                key={log.id}
                                sx={{
                                  p: 1.5,
                                  background: "rgba(0, 0, 0, 0.15)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    mb: 1,
                                  }}
                                >
                                  <Search
                                    size={14}
                                    style={{ color: "#8b5cf6" }}
                                  />
                                  <Typography variant="body2" fontWeight={700}>
                                    {log.username}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  {logTime ? logTime.toLocaleString() : "--"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontFamily: "monospace", opacity: 0.8 }}
                                  color="text.secondary"
                                >
                                  {log.ipAddress || "No IP"}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Column 2: AI Reports */}
                  <Grid item xs={12} lg={4}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        mb: 2,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        pb: 1,
                      }}
                    >
                      AI Reports ({aiReports.length})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
                      {aiReports.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          No AI reports generated yet.
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          {aiReports.map((log) => {
                            const logTime = log.timestamp?.toDate();
                            return (
                              <Box
                                key={log.id}
                                sx={{
                                  p: 1.5,
                                  background: "rgba(0, 0, 0, 0.15)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flexWrap: "wrap",
                                    mb: 1,
                                  }}
                                >
                                  <Activity
                                    size={14}
                                    style={{ color: "#8b5cf6" }}
                                  />
                                  {log.photo &&
                                    log.photo.startsWith("data:image") && (
                                      <Avatar
                                        src={log.photo}
                                        variant="rounded"
                                        sx={{
                                          width: 24,
                                          height: 24,
                                          border: "1px solid #8b5cf6",
                                        }}
                                      />
                                    )}
                                  <Typography variant="body2" fontWeight={700}>
                                    {log.username}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  fullWidth
                                  onClick={() =>
                                    setSelectedReportText(
                                      log.report || "No report content.",
                                    )
                                  }
                                  sx={{
                                    mt: 1,
                                    mb: 1.5,
                                    fontSize: "0.75rem",
                                    py: 0.5,
                                    background: "rgba(139,92,246,0.06)",
                                    borderColor: "rgba(139,92,246,0.2)",
                                  }}
                                >
                                  View Report
                                </Button>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  {logTime ? logTime.toLocaleString() : "--"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontFamily: "monospace" }}
                                  color="text.secondary"
                                  display="block"
                                >
                                  {log.ipAddress || "No IP"}
                                </Typography>
                                {log.location && (
                                  <Typography
                                    variant="caption"
                                    color="primary.main"
                                    display="block"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {log.location}{" "}
                                    {log.coordinates
                                      ? `(${log.coordinates})`
                                      : ""}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Column 3: Visited Photos History */}
                  <Grid item xs={12} lg={4}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        mb: 2,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        pb: 1,
                      }}
                    >
                      Photos History ({userVisits.length})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
                      {userVisits.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          No visit photos captured yet.
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          {userVisits.map((visit) => {
                            const visitTime = visit.timestamp?.toDate();
                            return (
                              <Box
                                key={visit.id}
                                sx={{
                                  p: 1.5,
                                  background: "rgba(0, 0, 0, 0.15)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1.5,
                                    alignItems: "center",
                                    mb: 1,
                                  }}
                                >
                                  {visit.photo &&
                                  visit.photo.startsWith("data:image") ? (
                                    <Avatar
                                      src={visit.photo}
                                      variant="rounded"
                                      sx={{
                                        width: 48,
                                        height: 48,
                                        border: "1px solid #8b5cf6",
                                        cursor: "pointer",
                                        "&:hover": { opacity: 0.8 },
                                      }}
                                      onClick={() =>
                                        setSelectedReportText(visit.photo)
                                      }
                                    />
                                  ) : (
                                    <Avatar
                                      variant="rounded"
                                      sx={{ width: 48, height: 48 }}
                                    >
                                      No
                                    </Avatar>
                                  )}
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      {visitTime
                                        ? visitTime.toLocaleString()
                                        : "--"}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                    >
                                      {visit.location || "Unknown Location"}
                                    </Typography>
                                  </Box>
                                </Box>
                                {visit.coordinates && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontFamily: "monospace",
                                      display: "block",
                                    }}
                                    color="primary.main"
                                  >
                                    Coords: {visit.coordinates}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderUnregisteredUsers = () => (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          letterSpacing="-0.5px"
          gutterBottom
        >
          Unregistered User Visits
        </Typography>
        <Typography color="text.secondary">
          Location, coordinates, and photo logs snapped from
          unregistered/unsigned visitors.
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Photo</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>OS & Browser</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Coordinates</TableCell>
              <TableCell>Visited At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unregisteredVisits.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  No unregistered user visits logged yet.
                </TableCell>
              </TableRow>
            )}
            {unregisteredVisits.map((visit) => {
              const dateVal = visit.timestamp?.toDate();

              return (
                <React.Fragment key={visit.id}>
                  <TableRow hover>
                    <TableCell>
                      {visit.photo && visit.photo.startsWith("data:image") ? (
                        <Avatar
                          src={visit.photo}
                          sx={{
                            width: 36,
                            height: 36,
                            border: "1.5px solid #8b5cf6",
                            cursor: "pointer",
                            "&:hover": { opacity: 0.8 },
                          }}
                          onClick={() => setSelectedReportText(visit.photo)}
                        />
                      ) : (
                        <Avatar sx={{ width: 36, height: 36 }}>--</Avatar>
                      )}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "#8b5cf6",
                        fontWeight: 600,
                        fontFamily: "monospace",
                      }}
                    >
                      {visit.ipAddress || "--"}
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "20px",
                          fontSize: "0.8rem",
                          background: "rgba(6, 182, 212, 0.1)",
                          color: "#06b6d4",
                          border: "1px solid rgba(6, 182, 212, 0.2)",
                        }}
                      >
                        {visit.device?.type === "mobile" ? (
                          <Smartphone size={12} style={{ marginRight: 6 }} />
                        ) : (
                          <Monitor size={12} style={{ marginRight: 6 }} />
                        )}
                        {visit.device?.vendor || "Generic"}{" "}
                        {visit.device?.model || "Device"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color="text.primary"
                      >
                        {visit.device?.os || "Unknown"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {visit.device?.browser || "Browser"}
                      </Typography>
                    </TableCell>
                    <TableCell>{visit.location || "--"}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {visit.coordinates || "--"}
                    </TableCell>
                    <TableCell>
                      {dateVal
                        ? dateVal.toLocaleDateString() +
                          " " +
                          dateVal.toLocaleTimeString()
                        : "--"}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => toggleUnregExpand(visit.id)}
                        endIcon={
                          <ChevronRight
                            size={14}
                            style={{
                              transform: expandedUnregRows.has(visit.id)
                                ? "rotate(90deg)"
                                : "none",
                              transition: "transform 0.2s",
                            }}
                          />
                        }
                      >
                        Resumes
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={8}
                    >
                      <Collapse
                        in={expandedUnregRows.has(visit.id)}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box
                          sx={{
                            p: 2,
                            background: "rgba(0, 0, 0, 0.15)",
                            borderRadius: "8px",
                            m: 1.5,
                          }}
                        >
                          <Grid container spacing={2}>
                            {/* Column 1: Visit Summary */}
                            <Grid item xs={12} md={4}>
                              <Paper
                                sx={{
                                  p: 2.5,
                                  background: "#0f172a",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  borderRadius: "8px",
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="text.secondary"
                                  sx={{
                                    mb: 2,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Visit Session Info
                                </Typography>
                                {visit.photo &&
                                  visit.photo.startsWith("data:image") && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        mb: 2,
                                      }}
                                    >
                                      <Avatar
                                        src={visit.photo}
                                        variant="rounded"
                                        sx={{
                                          width: 80,
                                          height: 80,
                                          border: "1.5px solid #8b5cf6",
                                          cursor: "pointer",
                                          "&:hover": { opacity: 0.8 },
                                        }}
                                        onClick={() =>
                                          setSelectedReportText(visit.photo)
                                        }
                                      />
                                    </Box>
                                  )}
                                <List disablePadding>
                                  {[
                                    {
                                      label: "IP Address",
                                      val: visit.ipAddress || "--",
                                      isCode: true,
                                    },
                                    {
                                      label: "Location",
                                      val: visit.location || "--",
                                    },
                                    {
                                      label: "Coordinates",
                                      val: visit.coordinates || "--",
                                    },
                                    {
                                      label: "Device Type",
                                      val: visit.device?.type || "--",
                                    },
                                    {
                                      label: "Device Info",
                                      val:
                                        `${visit.device?.vendor || ""} ${visit.device?.model || ""}`.trim() ||
                                        "--",
                                    },
                                    {
                                      label: "OS & Browser",
                                      val:
                                        `${visit.device?.os || ""} - ${visit.device?.browser || ""}`.trim() ||
                                        "--",
                                    },
                                    {
                                      label: "Visited At",
                                      val:
                                        visit.timestamp
                                          ?.toDate()
                                          ?.toLocaleString() || "--",
                                    },
                                  ].map((item, idx) => (
                                    <React.Fragment key={item.label}>
                                      {idx > 0 && (
                                        <Divider
                                          sx={{
                                            my: 1,
                                            borderColor:
                                              "rgba(255,255,255,0.06)",
                                          }}
                                        />
                                      )}
                                      <ListItem
                                        disablePadding
                                        sx={{
                                          flexDirection: "column",
                                          alignItems: "flex-start",
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          fontWeight={700}
                                          sx={{
                                            textTransform: "uppercase",
                                            fontSize: "0.7rem",
                                            mb: 0.5,
                                          }}
                                        >
                                          {item.label}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontFamily: item.isCode
                                              ? "monospace"
                                              : "inherit",
                                          }}
                                        >
                                          {item.val}
                                        </Typography>
                                      </ListItem>
                                    </React.Fragment>
                                  ))}
                                </List>
                              </Paper>
                            </Grid>

                            {/* Column 2: Uploaded Resumes */}
                            <Grid item xs={12} md={8}>
                              <Paper
                                sx={{
                                  p: 2.5,
                                  background: "#0f172a",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                  borderRadius: "8px",
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="text.secondary"
                                  sx={{
                                    mb: 2,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Uploaded Resumes & Reports
                                </Typography>
                                {!unregResumesMap[visit.id] ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      py: 2,
                                    }}
                                  >
                                    <CircularProgress size={16} />
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Loading resumes...
                                    </Typography>
                                  </Box>
                                ) : unregResumesMap[visit.id].length === 0 ? (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontStyle: "italic", py: 1 }}
                                  >
                                    No resumes uploaded by this unregistered
                                    visitor.
                                  </Typography>
                                ) : (
                                  <Grid container spacing={2}>
                                    {unregResumesMap[visit.id].map((resDoc) => (
                                      <Grid item xs={12} sm={6} key={resDoc.id}>
                                        <Box
                                          sx={{
                                            p: 2,
                                            background: "rgba(30, 41, 59, 0.4)",
                                            border:
                                              "1px solid rgba(255, 255, 255, 0.05)",
                                            borderRadius: "8px",
                                          }}
                                        >
                                          <Typography
                                            variant="subtitle2"
                                            fontWeight={700}
                                            sx={{
                                              color: "#8b5cf6",
                                              mb: 0.5,
                                              textOverflow: "ellipsis",
                                              overflow: "hidden",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {resDoc.fileName}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                            sx={{ mb: 1.5 }}
                                          >
                                            Uploaded:{" "}
                                            {resDoc.timestamp
                                              ?.toDate()
                                              ?.toLocaleString() || "Unknown"}
                                          </Typography>
                                          <Box sx={{ display: "flex", gap: 1 }}>
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              fullWidth
                                              onClick={() =>
                                                setSelectedReportText(
                                                  `RESUME CONTENT:\n\n${resDoc.content}`,
                                                )
                                              }
                                              sx={{ fontSize: "0.75rem" }}
                                            >
                                              Resume
                                            </Button>
                                            <Button
                                              variant="contained"
                                              size="small"
                                              fullWidth
                                              onClick={() =>
                                                setSelectedReportText(
                                                  resDoc.report,
                                                )
                                              }
                                              sx={{ fontSize: "0.75rem" }}
                                            >
                                              Report
                                            </Button>
                                          </Box>
                                        </Box>
                                      </Grid>
                                    ))}
                                  </Grid>
                                )}
                              </Paper>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderUnregisteredStats = () => (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          letterSpacing="-0.5px"
          gutterBottom
        >
          Unregistered Visit Stats
        </Typography>
        <Typography color="text.secondary">
          Counts every unregistered visit record, even when the same IP appears
          many times.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  variant="subtitle2"
                >
                  Total Visit Records
                </Typography>
                <BarChart3 size={20} color="#f59e0b" />
              </Box>
              <Typography variant="h2" fontWeight={800}>
                {totalUnregisteredVisits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  color="text.secondary"
                  fontWeight={500}
                  variant="subtitle2"
                >
                  Unique IP Addresses
                </Typography>
                <Users size={20} color="#06b6d4" />
              </Box>
              <Typography variant="h2" fontWeight={800}>
                {sortedUnregisteredIpCounts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>IP Address</TableCell>
              <TableCell align="right">Visit Count</TableCell>
              <TableCell align="right">Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUnregisteredIpCounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  No unregistered visit records found.
                </TableCell>
              </TableRow>
            ) : (
              sortedUnregisteredIpCounts.map(([ip, count]) => {
                const share = totalUnregisteredVisits
                  ? ((count / totalUnregisteredVisits) * 100).toFixed(1)
                  : "0.0";

                return (
                  <TableRow key={ip} hover>
                    <TableCell
                      sx={{
                        color: "#8b5cf6",
                        fontWeight: 600,
                        fontFamily: "monospace",
                      }}
                    >
                      {ip}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {count}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>
                      {share}%
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderOSPercentage = () => {
    const OS_COLORS = {
      Windows: "#0078d4",
      Android: "#3ddc84",
      macOS: "#a3a3a3",
      iOS: "#ff2d55",
      Linux: "#f29111",
      Ubuntu: "#e95420",
      Unknown: "#64748b",
    };

    const getOsColor = (os) => {
      const matched = Object.keys(OS_COLORS).find((key) =>
        os.toLowerCase().includes(key.toLowerCase())
      );
      return matched ? OS_COLORS[matched] : "#8b5cf6";
    };

    const unregisteredOsCounts = unregisteredVisits.reduce((counts, visit) => {
      const os = visit.device?.os || "Unknown";
      counts[os] = (counts[os] || 0) + 1;
      return counts;
    }, {});

    const sortedUnregisteredOsCounts = Object.entries(unregisteredOsCounts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );

    const total = unregisteredVisits.length;

    const renderPieChart = () => {
      if (total === 0) {
        return (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240 }}>
            <Typography color="text.secondary">No OS data available</Typography>
          </Box>
        );
      }

      let accumulatedAngle = 0;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-around",
            gap: 4,
            py: 3,
          }}
        >
          {/* SVG Pie/Donut Chart */}
          <Box sx={{ position: "relative", width: 220, height: 220 }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {sortedUnregisteredOsCounts.map(([os, count]) => {
                const percentage = (count / total) * 100;
                const angle = (count / total) * 360;
                const color = getOsColor(os);
                
                const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
                const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
                
                accumulatedAngle += angle;
                
                const x2 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
                const y2 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const pathData = `
                  M 50 50
                  L ${x1} ${y1}
                  A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}
                  Z
                `;
                
                return (
                  <path
                    key={os}
                    d={pathData}
                    fill={color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    style={{
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.transformOrigin = "50% 50%";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "none";
                    }}
                  />
                );
              })}
              <circle cx="50" cy="50" r="24" fill="#0f172a" />
            </svg>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Visits
              </Typography>
            </Box>
          </Box>

          {/* Legend Grid */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 200 }}>
            {sortedUnregisteredOsCounts.map(([os, count]) => {
              const percentage = ((count / total) * 100).toFixed(1);
              const color = getOsColor(os);
              return (
                <Box key={os} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "4px",
                      background: color,
                      boxShadow: `0 0 10px ${color}66`,
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", flexGrow: 1, gap: 3 }}>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {os}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      {percentage}%
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    };

    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            letterSpacing="-0.5px"
            gutterBottom
          >
            OS Percentage Breakdown
          </Typography>
          <Typography color="text.secondary">
            Analysis of Operating Systems used by unregistered visitors.
          </Typography>
        </Box>

        <Card sx={{ mb: 4, p: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              OS Distribution Chart
            </Typography>
            {renderPieChart()}
          </CardContent>
        </Card>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Operating System</TableCell>
                <TableCell align="right">Visit Count</TableCell>
                <TableCell align="right">Percentage Share</TableCell>
                <TableCell align="right">Visual Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUnregisteredOsCounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    No unregistered visit records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUnregisteredOsCounts.map(([os, count]) => {
                  const share = total
                    ? ((count / total) * 100).toFixed(1)
                    : "0.0";
                  const color = getOsColor(os);

                  return (
                    <TableRow key={os} hover>
                      <TableCell sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: color,
                          }}
                        />
                        <Typography fontWeight={600}>{os}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {count}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        {share}%
                      </TableCell>
                      <TableCell align="right" sx={{ width: "30%" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Box
                            sx={{
                              width: "100%",
                              maxWidth: 120,
                              height: 6,
                              borderRadius: 3,
                              background: "rgba(255, 255, 255, 0.05)",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${share}%`,
                                height: "100%",
                                borderRadius: 3,
                                background: color,
                                boxShadow: `0 0 8px ${color}`,
                              }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar Navigation Drawer */}
        <Box
          component="aside"
          sx={{
            width: 260,
            height: "100vh",
            position: "sticky",
            top: 0,
            py: 4,
            px: 2,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(30, 41, 59, 0.4)",
            backdropFilter: "blur(12px)",
            zIndex: 100,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1 }}>
            <Shield
              size={24}
              style={{
                color: "#8b5cf6",
                filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))",
              }}
            />
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">
              LeetLens Admin
            </Typography>
          </Box>

          <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              {
                id: "overview",
                label: "Overview",
                icon: <LayoutDashboard size={18} />,
              },
              {
                id: "users",
                label: "Registered Users",
                icon: <Users size={18} />,
              },
              {
                id: "unregistered",
                label: "Unregistered Users",
                icon: <Smartphone size={18} />,
              },
              {
                id: "unregistered-os",
                label: "OS Percentage",
                icon: <PieChart size={18} />,
              },
              {
                id: "unregistered-stats",
                label: "Unregistered Stats",
                icon: <BarChart3 size={18} />,
              },
            ].map((tab) => {
              const isTabActive =
                !selectedFolder && !selectedUser && activeTab === tab.id;
              return (
                <ListItem key={tab.id} disablePadding>
                  <ListItemButton
                    selected={isTabActive}
                    onClick={() => {
                      setSelectedFolder(null);
                      setSelectedUser(null);
                      setActiveTab(tab.id);
                    }}
                    sx={{
                      borderRadius: "8px",
                      py: 1.5,
                      color: isTabActive ? "#ffffff" : "text.secondary",
                      background: isTabActive
                        ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important"
                        : "transparent",
                      boxShadow: isTabActive
                        ? "0 4px 15px rgba(139, 92, 246, 0.4)"
                        : "none",
                      "&:hover": {
                        background: isTabActive
                          ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                          : "rgba(255,255,255,0.05)",
                        color: isTabActive ? "#ffffff" : "text.primary",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                      {tab.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={tab.label}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        fontSize: "0.92rem",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}

            {selectedFolder && (
              <ListItem disablePadding sx={{ mt: 1 }}>
                <ListItemButton
                  selected={true}
                  sx={{
                    borderRadius: "8px",
                    py: 1.5,
                    color: "#ffffff",
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important",
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                    <Folder size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Day Details"
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: "0.92rem",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>

        {/* Main Content Pane */}
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 5, maxWidth: 1280, mx: "auto" }}
        >
          {selectedUser
            ? renderUserDetails()
            : activeTab === "unregistered"
              ? renderUnregisteredUsers()
              : activeTab === "unregistered-os"
                ? renderOSPercentage()
                : activeTab === "unregistered-stats"
                  ? renderUnregisteredStats()
                  : activeTab === "users"
                    ? renderRegisteredUsers()
                    : !selectedFolder
                      ? renderOverview()
                      : renderFolderDetails()}
        </Box>
      </Box>

      {/* MUI Dialog replacement for the custom admin report/photo modal */}
      <Dialog
        open={Boolean(selectedReportText)}
        onClose={() => setSelectedReportText(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            pb: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700} color="#8b5cf6">
            {selectedReportText?.startsWith("data:image")
              ? "Snapped Photo Details"
              : "Generated AI Report"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, textAlign: "center" }}>
          {selectedReportText?.startsWith("data:image") ? (
            <Box
              component="img"
              src={selectedReportText}
              alt="Captured visit snapshot"
              sx={{
                maxWidth: "100%",
                maxHeight: "65vh",
                borderRadius: "8px",
                border: "1.5px solid #8b5cf6",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            />
          ) : (
            <Box
              component="pre"
              sx={{
                textAlign: "left",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "8px",
                p: 2.5,
                border: "1px solid rgba(255, 255, 255, 0.05)",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {selectedReportText}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{ borderTop: "1px solid rgba(255,255,255,0.08)", p: 2 }}
        >
          <Button
            onClick={() => setSelectedReportText(null)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
