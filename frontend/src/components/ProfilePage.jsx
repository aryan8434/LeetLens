import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function ProfilePage({ onBack }) {
  const { userProfile, updateProfileData, credits } = useAuth();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

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
        bio
      });
      setStatus({ type: "success", message: "Profile updated successfully!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (userName) => {
    if (!userName) return "U";
    return userName.charAt(0).toUpperCase();
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
          <div className="profile-avatar-large">
            {getInitials(name || userProfile?.email)}
          </div>
          <h3>{name || "User Profile"}</h3>
          <p className="profile-email">{userProfile?.email}</p>
          
          <div className="profile-stat-box">
            <div className="profile-stat-label">Available Search Credits</div>
            <div className="profile-stat-val">{credits}</div>
          </div>
        </div>

        <div className="profile-main-card">
          <h2>Edit Profile</h2>
          <p className="section-desc">Keep your details up-to-date for recruiter evaluations and dashboard customizations.</p>

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

            <button type="submit" className="profile-save-btn" disabled={loading}>
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </form>

          {status.message && (
            <div className={`profile-status-msg ${status.type}`}>
              {status.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
