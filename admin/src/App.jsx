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
              <th>Email</th>
              <th>Name</th>
              <th>Credits</th>
              <th>IP Address</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {registeredUsers.length === 0 && (
              <tr>
                <td
                  colSpan="5"
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
              const isEditing = editingCreditsId === user.id;

              return (
                <tr className="table-row" key={user.id}>
                  <td style={{ color: "var(--accent)", fontWeight: "500" }}>
                    {user.email || "No Email"}
                  </td>
                  <td>{user.name || "--"}</td>
                  <td>
                    {isEditing ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          value={editingCreditsValue}
                          onChange={(e) =>
                            setEditingCreditsValue(Number(e.target.value))
                          }
                          style={{ width: 100 }}
                          disabled={updateLoading}
                        />
                        <button
                          className="action-btn"
                          onClick={() => saveCredits(user.id)}
                          disabled={updateLoading}
                        >
                          {updateLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setEditingCreditsId(null);
                            setEditingCreditsValue(0);
                          }}
                          disabled={updateLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span className="chip">{user.credits} Credits</span>
                        <button
                          className="action-btn"
                          onClick={() => startEditCredits(user)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const startEditCredits = (user) => {
    setEditingCreditsId(user.id);
    setEditingCreditsValue(Number(user.credits || 0));
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

      // Update local state optimistically
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, credits: newCredits } : u)),
      );
      setEditingCreditsId(null);
      setEditingCreditsValue(0);
    } catch (err) {
      console.error("Failed to update credits:", err);
      alert("Failed to update credits. See console for details.");
    } finally {
      setUpdateLoading(false);
    }
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
            className={`nav-item ${!selectedFolder && activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              setSelectedFolder(null);
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
        {activeTab === "users"
          ? renderRegisteredUsers()
          : !selectedFolder
            ? renderOverview()
            : renderFolderDetails()}
      </main>
    </div>
  );
}
