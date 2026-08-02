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

export default function ProfilePage({ onBack }) {
  const {
    userProfile,
    updateProfileData,
    credits,
    setCredits,
    currentUser,
    changePassword,
  } = useAuth();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setStatus({
        type: "error",
        message: err.message || "Failed to update profile.",
      });
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
      setPwdStatus({
        type: "error",
        message: "Password should be at least 6 characters.",
      });
      return;
    }

    setPwdLoading(true);
    setPwdStatus({ type: "", message: "" });

    try {
      await changePassword(newPassword);
      setPwdStatus({
        type: "success",
        message: "Password updated successfully!",
      });
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
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
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
              message: `🎉 Payment successful! Added ${pkg.credits} credits to your account for ₹${pkg.priceRs}. Total Balance: ${verifyData.credits} credits.`,
            });
          } catch (verifyErr) {
            setCreditStatus({ type: "error", message: verifyErr.message || "Payment verification failed." });
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

  const getInitials = (userName) => {
    if (!userName) return "U";
    return userName.charAt(0).toUpperCase();
  };

  return (
    <div className="profile-page-container">
      <button type="button" className="profile-back-btn" onClick={onBack}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </button>

      <div className="profile-grid">
        <div className="profile-sidebar-card">
          <div className="profile-avatar-large">
            {getInitials(name || userProfile?.email)}
          </div>
          <h3>{name || "User Profile"}</h3>
          <p className="profile-email">{userProfile?.email}</p>

          <div className="profile-stat-box">
            <div className="profile-stat-label">Available Search Credits</div>
            <div className="profile-stat-val credits-glow-text">{credits}</div>
          </div>
        </div>

        <div className="profile-main-card">
          <h2>Edit Profile</h2>
          <p className="section-desc">
            Keep your details up-to-date for recruiter evaluations and dashboard customizations.
          </p>

          <form onSubmit={handleSubmit} className="profile-editor-form">
            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-dob">Date of Birth</label>
                <input
                  id="profile-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            <div className="profile-form-row">
              <div className="profile-form-group">
                <label htmlFor="profile-age">Age</label>
                <input
                  id="profile-age"
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-location">Location</label>
                <input
                  id="profile-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="profile-form-group">
              <label htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself (DSA interests, goals, etc.)"
              />
            </div>

            <button
              type="submit"
              className="profile-save-btn"
              disabled={loading}
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </form>

          {status.message && (
            <div className={`profile-status-msg ${status.type}`}>
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

          <hr className="profile-section-divider" style={{ margin: "2rem 0" }} />

          {/* Credits Purchase Section inside Profile */}
          <div className="profile-credits-purchase-section">
            <h3>Purchase Credits (Razorpay Checkout)</h3>
            <p className="section-desc" style={{ marginBottom: "1rem" }}>
              Top up your evaluation credits instantly with Razorpay standard payment checkout.
            </p>

            {creditStatus.message && (
              <div className={`profile-status-msg ${creditStatus.type}`} style={{ marginBottom: "1rem" }}>
                {creditStatus.type === "success" ? (
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
                {creditStatus.message}
              </div>
            )}

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
                    >
                      {isBuying ? "Processing..." : `Pay ₹${pkg.priceRs}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="profile-section-divider" style={{ margin: "2rem 0" }} />

          <div className="profile-security-section">
            <h3>Change Password</h3>
            {isGoogleUser ? (
              <p className="profile-security-note">
                Password changes are managed through Google because your account
                is authenticated with Google.
              </p>
            ) : (
              <form
                onSubmit={handlePasswordChange}
                className="profile-editor-form"
              >
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-new-pwd">New Password</label>
                    <input
                      id="profile-new-pwd"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="profile-confirm-pwd">
                      Confirm Password
                    </label>
                    <input
                      id="profile-confirm-pwd"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={pwdLoading}
                >
                  {pwdLoading ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            )}

            {pwdStatus.message && (
              <div className={`profile-status-msg ${pwdStatus.type}`}>
                {pwdStatus.type === "success" ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                )}
                {pwdStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
