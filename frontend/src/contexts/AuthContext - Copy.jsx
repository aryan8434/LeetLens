import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

function normalizeCredits(value) {
  const credits = Number(value || 0);
  return Number.isFinite(credits) ? Math.max(0, credits) : 0;
}

function normalizeUserProfile(data, user) {
  if (!data && !user) {
    return null;
  }

  return {
    uid: data?.uid || user?.uid || "",
    name: data?.name || user?.displayName || user?.email?.split("@")[0] || "",
    email: data?.email || user?.email || "",
    dob: data?.dob || "",
    credits: normalizeCredits(data?.credits),
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  async function syncUserWithBackend(user) {
    if (!user) {
      setCredits(0);
      setUserProfile(null);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCredits(normalizeCredits(data.credits));
        setUserProfile(normalizeUserProfile(data.user, user));
      }

      // Ask for location to collect demographic data for recruiters
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = position.coords.latitude.toFixed(4);
              const lng = position.coords.longitude.toFixed(4);
              const locationString = `Lat: ${lat}, Lng: ${lng}`;

              await fetch(`${API_BASE_URL}/api/profile`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ location: locationString }),
              });
            } catch (err) {
              console.error("Error updating location:", err);
            }
          },
          (error) => {
            console.warn("Location access denied or failed:", error.message);
          },
        );
      }
    } catch (error) {
      console.error("Error syncing user with backend:", error);
    }
  }

  const refreshCredits = async () => {
    if (currentUser) {
      await syncUserWithBackend(currentUser);
    }
  };

  useEffect(() => {
    let unsubscribeCredits = null;
    let isActive = true;
    let authChangeId = 0;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const changeId = authChangeId + 1;
      authChangeId = changeId;

      if (unsubscribeCredits) {
        unsubscribeCredits();
        unsubscribeCredits = null;
      }

      setCurrentUser(user);
      if (!user) {
        setCredits(0);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      await syncUserWithBackend(user);

      if (!isActive || changeId !== authChangeId) {
        return;
      }

      unsubscribeCredits = onSnapshot(
        doc(db, "registered_users", user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            const profile = normalizeUserProfile(
              { uid: user.uid, ...snapshot.data() },
              user,
            );
            setUserProfile(profile);
            setCredits(profile.credits);
          }
        },
        (error) => {
          console.error("Error listening for credit changes:", error);
        },
      );

      setLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
      if (unsubscribeCredits) {
        unsubscribeCredits();
      }
    };
  }, []);

  const logout = () => {
    setCredits(0);
    setUserProfile(null);
    return firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    credits,
    refreshCredits,
    setCredits,
    setUserProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
