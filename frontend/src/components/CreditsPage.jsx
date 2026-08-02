import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

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
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
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
              message: `🎉 Payment successful! Added ${pkg.credits} credits to your account for ₹${pkg.priceRs}. Total Balance: ${verifyData.credits} credits.`,
            });
          } catch (verifyErr) {
            setStatus({ type: "error", message: verifyErr.message || "Payment verification failed." });
          } finally {
            setPurchasingKey(null);
          }
        },
        prefill: {
          name: userProfile?.name || currentUser.displayName || "",
          email: currentUser.email || "",
        },
        theme: {
          color: "#38bdf8",
        },
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

  return (
    <div className="profile-page-container">
      <button type="button" className="profile-back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>

      <div className="profile-grid">
        <div className="profile-sidebar-card">
          <div className="credits-icon-large">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 5 0c0 1.4-1.1 2.2-2.5 2.5s-2.5 1.1-2.5 2.5a2.5 2.5 0 0 0 5 0" />
            </svg>
          </div>
          <h3>Credits Balance</h3>
          <div className="profile-stat-box" style={{ marginTop: "1rem" }}>
            <div className="profile-stat-val credits-glow-text">{credits}</div>
            <div className="profile-stat-label">Credits Available</div>
          </div>
          <div className="sidebar-info-box">
            <p>1 Credit = 1 AI Coach Evaluation or 1 Resume Matcher Evaluation</p>
          </div>
        </div>

        <div className="profile-main-card">
          <div className="credits-header-row">
            <div>
              <h2>Manage Credits</h2>
              <p className="credits-subtitle-note">Claim your free weekly credits and purchase top-up packages below.</p>
            </div>
          </div>

          {status.message && (
            <div className={`profile-status-msg ${status.type}`} style={{ marginBottom: "1.5rem" }}>
              {status.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
              {status.message}
            </div>
          )}

          {/* Weekly Free Claim */}
          <div className="credits-claim-section" style={{ marginBottom: "2rem" }}>
            <div className="credits-claim-card">
              <div className="credits-claim-info">
                <h3>Weekly Free Reward</h3>
                <p>Claim 3 free credits every week to generate comprehensive AI reports. Cooldown triggers for 7 days post claim.</p>
              </div>

              <div className="credits-claim-action-box">
                {timeLeft > 0 ? (
                  <div className="credits-cooldown-timer">
                    <span className="timer-lock-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <span className="timer-text">{formatCountdown(timeLeft)}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className={`credits-claim-btn ${timeLeft > 0 ? "locked" : ""}`}
                  disabled={timeLeft > 0 || claiming || purchasingKey !== null}
                  onClick={handleClaimFreeCredits}
                >
                  {claiming ? "Claiming..." : timeLeft > 0 ? "Claim Locked" : "Get Free 3 Credits"}
                </button>
              </div>
            </div>
          </div>

          <hr className="profile-section-divider" style={{ margin: "2rem 0" }} />

          <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
            <h3>Buy Credits</h3>
            <p className="credits-subtitle-note">Select a credit top-up package to pay securely via Razorpay.</p>
          </div>

          {/* Pricing Grid */}
          <div className="purchase-tier-grid">
            {PURCHASE_PACKAGES.map((pkg) => {
              const isBuying = purchasingKey === pkg.key;
              return (
                <div key={pkg.key} className={`tier-card ${pkg.badge ? "highlighted-tier" : ""}`}>
                  {pkg.badge && <span className="tier-badge">{pkg.badge}</span>}
                  <div className="tier-header">
                    <h3 className="tier-name">{pkg.name}</h3>
                    <div className="tier-price-wrap">
                      <span className="tier-currency">₹</span>
                      <span className="tier-price">{pkg.priceRs}</span>
                    </div>
                    <span className="tier-credits">{pkg.credits} Credits</span>
                    <span className="tier-unit-price">{pkg.perCredit}</span>
                  </div>
                  <p className="tier-desc">{pkg.description}</p>
                  <button
                    type="button"
                    className="tier-buy-btn"
                    disabled={purchasingKey !== null}
                    onClick={() => handlePurchaseCredits(pkg)}
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "12px",
                      background: isBuying ? "#475569" : pkg.badge === "MOST POPULAR" ? "linear-gradient(135deg, #38bdf8, #3b82f6)" : "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      border: "none",
                      borderRadius: "10px",
                      boxShadow: isBuying ? "none" : "0 4px 15px rgba(2, 132, 199, 0.35)",
                      cursor: isBuying ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => { if (!isBuying) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { if (!isBuying) e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <span>{isBuying ? "Processing..." : `⚡ Pay ₹${pkg.priceRs} via Razorpay`}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Transaction History Section */}
          <hr className="profile-section-divider" style={{ margin: "3rem 0 2rem 0" }} />

          <div className="transaction-history-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white", margin: 0, fontSize: "1.3rem" }}>
                  <span>💳</span> Payment & Transaction History
                </h3>
                <p className="credits-subtitle-note" style={{ margin: "0.25rem 0 0 0" }}>
                  All credit top-ups and Razorpay transactions processed on your account.
                </p>
              </div>
              <button
                type="button"
                onClick={loadTransactions}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "white",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}
              >
                🔄 Refresh
              </button>
            </div>

            {loadingTx ? (
              <div style={{ padding: "2.5rem", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.05)", color: "#94a3b8" }}>
                Loading transaction history...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{
                padding: "3rem 2rem",
                textAlign: "center",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(12px)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🪙</div>
                <h4 style={{ color: "#cbd5e1", margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>No Transactions Yet</h4>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>When you purchase credits via Razorpay above, your full receipt history and added balance will appear here instantly.</p>
              </div>
            ) : (
              <div style={{
                overflowX: "auto",
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(16px)",
                borderRadius: "16px",
                border: "1px solid rgba(167, 139, 250, 0.2)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.03)" }}>
                      <th style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                      <th style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Package / Credits</th>
                      <th style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount Paid</th>
                      <th style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Method</th>
                      <th style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const pkgName = PURCHASE_PACKAGES.find((p) => p.key === tx.packageKey)?.name || "Credits Package";
                      return (
                        <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "1rem 1.25rem", color: "#e2e8f0", fontSize: "0.92rem", whiteSpace: "nowrap" }}>{tx.dateStr}</td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <div style={{ color: "white", fontWeight: "700", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ color: "#38bdf8" }}>+{tx.credits} Credits</span>
                            </div>
                            <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "2px" }}>{pkgName}</div>
                          </td>
                          <td style={{ padding: "1rem 1.25rem", color: "#34d399", fontWeight: "700", fontSize: "1rem" }}>₹{tx.amountRs}</td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <div style={{ color: "#cbd5e1", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>🛡️</span> {tx.method}
                            </div>
                            {tx.paymentId && tx.paymentId !== "Completed Transaction" && (
                              <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px", fontFamily: "monospace" }}>ID: {tx.paymentId}</div>
                            )}
                          </td>
                          <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#34d399",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              boxShadow: "0 0 10px rgba(16, 185, 129, 0.1)"
                            }}>
                              ✓ {tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
