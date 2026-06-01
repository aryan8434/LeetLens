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
  Monitor,
  Smartphone,
  Loader2,
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
  const [editingCreditsId, setEditingCreditsId] = useState(null);
  const [editingCreditsValue, setEditingCreditsValue] = useState(0);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearches, setUserSearches] = useState([]);
  const [loadingUserSearches, setLoadingUserSearches] = useState(false);
  const [selectedReportText, setSelectedReportText] = useState(null);

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

        // Sorting string dates might vary; reversing displays latest if incrementally added
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
      } catch (err) {
        console.error("Failed to load metrics:", err);
        setErrorMsg("Failed to load metrics. See console for details.");
      }
    };
    fetchMetrics();
  }, []);

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setEditingCreditsValue(user.credits || 0);
    setLoadingUserSearches(true);
    setErrorMsg(null);
    setUserSearches([]);

    try {
      const searchesSnapshot = await getDocs(
        collection(db, "registered_users", user.id, "searches")
      );
      const s = [];
      searchesSnapshot.forEach((docSnap) => {
        s.push({ id: docSnap.id, ...docSnap.data() });
      });

      setUserSearches(
        s.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
      );
    } catch (err) {
      console.error("Failed to load user searches:", err);
      setErrorMsg("Failed to load user searches history. See console for details.");
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

  const renderOverview = () => (
    <>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time metrics from your LeetLens deployment.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass">
          <div className="metric-header">
            Total Unique Visitors
            <Users size={18} />
          </div>
          <div className="metric-value">{totalVisitors}</div>
        </div>
        <div className="metric-card glass">
          <div className="metric-header">
            Total Searches Processed
            <Activity size={18} />
          </div>
          <div className="metric-value">{totalSearches}</div>
        </div>
      </div>

      <h2 className="section-title">
        <Folder size={20} /> Daily Tracking Folders
      </h2>
      <div className="folder-grid">
        {dailyFolders.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>
            No daily logs generated yet.
          </p>
        ) : (
          dailyFolders.map((folderName) => (
            <div
              key={folderName}
              className="folder-card glass"
              onClick={() => openFolder(folderName)}
            >
              <Folder size={32} />
              <span className="folder-name">{folderName}</span>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderFolderDetails = () => (
    <>
      <button
        className="back-btn"
        onClick={() => {
          setSelectedFolder(null);
          setActiveTab("overview");
          setErrorMsg(null);
        }}
      >
        <ArrowLeft size={18} /> Back to Overview
      </button>

      <div className="page-header">
        <h1>{selectedFolder}</h1>
        <p>Visitor logs and search details for this specific day.</p>
        {errorMsg && (
          <p style={{ color: "#ffb4b4", marginTop: 8 }}>{errorMsg}</p>
        )}
      </div>

      {loading ? (
        <div className="loading-wrapper glass">
          <Loader2 size={32} className="spinner" />
          <p>Fetching nested logs...</p>
        </div>
      ) : (
        <div className="table-container glass">
          <table>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Device</th>
                <th>OS & Browser</th>
                <th>First Seen At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {folderVisitors.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      padding: "32px",
                    }}
                  >
                    No visitors logged for this day.
                  </td>
                </tr>
              )}
              {folderVisitors.map((visitor) => {
                const dateVal = visitor.last_visited_at?.toDate();
                const isExpanded = expandedRows.has(visitor.id);

                return (
                  <React.Fragment key={visitor.id}>
                    <tr className="table-row">
                      <td
                        style={{
                          fontFamily: "monospace",
                          color: "var(--accent)",
                        }}
                      >
                        {visitor.ip || "Unknown"}
                      </td>
                      <td>
                        <span className="chip">
                          {visitor.device?.type === "mobile" ? (
                            <Smartphone size={14} style={{ marginRight: 4 }} />
                          ) : (
                            <Monitor size={14} style={{ marginRight: 4 }} />
                          )}
                          {visitor.device?.vendor} {visitor.device?.model}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "white",
                            marginBottom: 2,
                          }}
                        >
                          {visitor.device?.os}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {visitor.device?.browser}
                        </div>
                      </td>
                      <td>{dateVal ? dateVal.toLocaleTimeString() : "--"}</td>
                      <td>
                        <button
                          className="action-btn"
                          onClick={() => toggleExpand(visitor.id)}
                        >
                          {visitor.searchesList?.length} Searches
                          <ChevronRight
                             size={16}
                             style={{
                               transform: isExpanded ? "rotate(90deg)" : "none",
                               transition: "transform 0.2s",
                             }}
                          />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0, border: "none" }}>
                          <div className="searches-list">
                            <h4
                              style={{
                                marginBottom: "12px",
                                color: "var(--text-secondary)",
                                fontSize: "0.85rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Nested Search Lookups
                            </h4>
                            {visitor.searchesList?.length === 0 ? (
                              <p
                                style={{
                                  color: "var(--text-secondary)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                No searches performed yet.
                              </p>
                            ) : (
                              visitor.searchesList.map((search) => (
                                <div key={search.id} className="search-item">
                                  <div className="search-name">
                                    <Search /> {search.username}
                                  </div>
                                  <div className="search-time">
                                    {search.timestamp
                                      ?.toDate()
                                      ?.toLocaleTimeString()}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderRegisteredUsers = () => (
    <>
      <div className="page-header">
        <h1>Registered Users</h1>
        <p>List of all users signed up on LeetLens.</p>
      </div>

      <div className="table-container glass">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Email</th>
              <th>Name</th>
              <th>Credits</th>
              <th>Location</th>
              <th>Coordinates</th>
              <th>IP Address</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registeredUsers.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    padding: "32px",
                  }}
                >
                  No registered users found.
                </td>
              </tr>
            )}
            {registeredUsers.map((user) => {
              const dateVal = user.createdAt?.toDate();

              return (
                <tr className="table-row" key={user.id}>
                  <td>
                    {user.photo && user.photo.startsWith("data:image") ? (
                      <img
                        src={user.photo}
                        alt="avatar"
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid var(--accent)",
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {user.photo || "--"}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--accent)", fontWeight: "500" }}>
                    {user.email || "No Email"}
                  </td>
                  <td>{user.name || "--"}</td>
                  <td>
                    <span className="chip">{user.credits} Credits</span>
                  </td>
                  <td>{user.location || "--"}</td>
                  <td>{user.coordinates || "--"}</td>
                  <td style={{ fontFamily: "monospace" }}>
                    {user.ipAddress || "--"}
                  </td>
                  <td>
                    {dateVal
                      ? dateVal.toLocaleDateString() +
                        " " +
                        dateVal.toLocaleTimeString()
                      : "--"}
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => openUserDetails(user)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const saveCredits = async (userId) => {
    const newCredits = Number(editingCreditsValue || 0);
    if (Number.isNaN(newCredits) || newCredits < 0)
      return alert("Please enter a valid non-negative number");

    setUpdateLoading(true);
    try {
      await updateDoc(doc(db, "registered_users", userId), {
        credits: newCredits,
      });

      // Update local state optimistically
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, credits: newCredits } : u)),
      );
      setSelectedUser((prev) => (prev ? { ...prev, credits: newCredits } : null));
      alert("Credits updated successfully!");
    } catch (err) {
      console.error("Failed to update credits:", err);
      alert("Failed to update credits. See console for details.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUserFromDetails = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user's records from the database? This action cannot be undone.")) {
      return;
    }

    setUpdateLoading(true);
    try {
      await deleteDoc(doc(db, "registered_users", userId));

      // Update local state
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

  const renderUserDetails = () => {
    if (!selectedUser) return null;

    const dateVal = selectedUser.createdAt?.toDate();
    const profileSearches = userSearches.filter(
      (s) => s.type === "analysis" || !s.type
    );
    const aiReports = userSearches.filter((s) => s.type === "ai_report");

    return (
      <>
        <button
          className="back-btn"
          onClick={() => {
            setSelectedUser(null);
            setUserSearches([]);
            setErrorMsg(null);
          }}
        >
          <ArrowLeft size={18} /> Back to Registered Users
        </button>

        <div className="page-header">
          <h1>User Profile: {selectedUser.name || "Unnamed User"}</h1>
          <p>Manage credits, deletion and view search/evaluation history for this account.</p>
          {errorMsg && (
            <p style={{ color: "#ffb4b4", marginTop: 8 }}>{errorMsg}</p>
          )}
        </div>

        <div className="user-details-grid">
          {/* Left Column: Management & Profile */}
          <div className="detail-sidebar-card glass">
            <div className="profile-info-group">
              <h3>Profile Summary</h3>
              {selectedUser.photo && selectedUser.photo.startsWith("data:image") && (
                <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
                  <img
                    src={selectedUser.photo}
                    alt="Latest clicked profile"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--accent)",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
                    }}
                  />
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value accent-text">{selectedUser.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{selectedUser.name || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Age:</span>
                <span className="info-value">{selectedUser.age || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">DOB:</span>
                <span className="info-value">{selectedUser.dob || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">{selectedUser.location || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Coordinates:</span>
                <span className="info-value">{selectedUser.coordinates || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Bio:</span>
                <span className="info-value bio-text">{selectedUser.bio || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Registered IP:</span>
                <span className="info-value code-font">{selectedUser.ipAddress || "--"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Registered At:</span>
                <span className="info-value">
                  {dateVal
                    ? dateVal.toLocaleDateString() + " " + dateVal.toLocaleTimeString()
                    : "--"}
                </span>
              </div>
            </div>

            <hr className="detail-divider" />

            <div className="credits-edit-section">
              <h3>Edit Credits</h3>
              <div className="credits-edit-row">
                <input
                  type="number"
                  min={0}
                  value={editingCreditsValue}
                  onChange={(e) =>
                    setEditingCreditsValue(Number(e.target.value))
                  }
                  disabled={updateLoading}
                />
                <button
                  className="action-btn"
                  onClick={() => saveCredits(selectedUser.id)}
                  disabled={updateLoading}
                >
                  {updateLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <hr className="detail-divider" />

            <div className="danger-zone-section">
              <h3>Danger Zone</h3>
              <p className="danger-desc">This permanently deletes the user's database record, resetting all credits and logs.</p>
              <button
                className="action-btn delete-btn"
                style={{ width: "100%" }}
                onClick={() => handleDeleteUserFromDetails(selectedUser.id)}
                disabled={updateLoading}
              >
                Delete User Records
              </button>
            </div>
          </div>

          {/* Right Column: Search Logs & AI Reports */}
          <div className="detail-history-card glass">
            <h2>User Activity Log</h2>

            {loadingUserSearches ? (
              <div className="loading-wrapper-inline">
                <Loader2 size={24} className="spinner" />
                <p>Loading activity logs...</p>
              </div>
            ) : (
              <div className="history-split-columns">
                {/* Column 1: Profile Searches */}
                <div className="history-column">
                  <h3>Profile Search History ({profileSearches.length})</h3>
                  <div className="history-list-wrap">
                    {profileSearches.length === 0 ? (
                      <p className="empty-text">No profile searches logged yet.</p>
                    ) : (
                      <div className="activity-list">
                        {profileSearches.map((log) => {
                          const logTime = log.timestamp?.toDate();
                          return (
                            <div className="activity-log-item" key={log.id}>
                              <div className="log-main">
                                <Search size={14} />
                                <strong>{log.username}</strong>
                              </div>
                              <div className="log-meta">
                                <span>{logTime ? logTime.toLocaleString() : "--"}</span>
                                <span className="code-font">{log.ipAddress || "No IP"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: AI Reports */}
                <div className="history-column">
                  <h3>Generated AI Reports ({aiReports.length})</h3>
                  <div className="history-list-wrap">
                    {aiReports.length === 0 ? (
                      <p className="empty-text">No AI reports generated yet.</p>
                    ) : (
                      <div className="activity-list">
                        {aiReports.map((log) => {
                          const logTime = log.timestamp?.toDate();
                          return (
                            <div className="activity-log-item" key={log.id}>
                              <div className="log-main" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Activity size={14} />
                                {log.photo && log.photo.startsWith("data:image") && (
                                  <img
                                    src={log.photo}
                                    alt="clicked thumbnail"
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "4px",
                                      objectFit: "cover",
                                    }}
                                  />
                                )}
                                <strong>{log.username}</strong>
                                <button
                                  type="button"
                                  className="view-report-link-btn"
                                  onClick={() => setSelectedReportText(log.report || "No report text content stored in this log.")}
                                >
                                  View Report
                                </button>
                              </div>
                              <div className="log-meta">
                                <span>{logTime ? logTime.toLocaleString() : "--"}</span>
                                <span className="code-font">{log.ipAddress || "No IP"}</span>
                                {log.location && <span style={{ marginLeft: "8px", color: "var(--accent)" }}>({log.location}{log.coordinates ? ` | ${log.coordinates}` : ""})</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <Shield className="brand-icon" size={24} />
          LeetLens Admin
        </div>
        <nav className="nav-links">
          <button
            className={`nav-item ${!selectedFolder && !selectedUser && activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              setSelectedFolder(null);
              setSelectedUser(null);
              setActiveTab("overview");
            }}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => {
              setSelectedFolder(null);
              setSelectedUser(null);
              setActiveTab("users");
            }}
          >
            <Users size={18} />
            Registered Users
          </button>
          <button
            className={`nav-item ${selectedFolder ? "active" : ""}`}
            disabled={!selectedFolder}
            style={{
              opacity: selectedFolder ? 1 : 0.5,
              cursor: selectedFolder ? "pointer" : "default",
            }}
          >
            <Folder size={18} />
            Day Details
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {selectedUser
          ? renderUserDetails()
          : activeTab === "users"
            ? renderRegisteredUsers()
            : !selectedFolder
              ? renderOverview()
              : renderFolderDetails()}
      </main>

      {selectedReportText ? (
        <div className="admin-modal-backdrop" onClick={() => setSelectedReportText(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelectedReportText(null)}>
              &times;
            </button>
            <h3 style={{ marginBottom: "1rem", color: "var(--accent)", fontSize: "1.3rem" }}>
              Generated AI Report
            </h3>
            <div className="admin-report-text-scroll">
              <pre className="admin-report-text">{selectedReportText}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
