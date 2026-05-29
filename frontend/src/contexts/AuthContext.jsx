import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [creditsReady, setCreditsReady] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const unsubscribeRef = useRef(null);

  const stopListening = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };

  const syncUserCredits = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `${errData.error || "Failed to sync user credits."} (Details: ${errData.details || "none"})`
        );
      }

      const data = await response.json();
      if (typeof data.credits === "number") {
        setCredits(data.credits);
      }
      if (data.user) {
        setUserProfile(data.user);
      }
    } catch (error) {
      console.error("Credit sync failed:", error);
    }
  };

  const updateProfileData = async (updates) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to update profile.");
    }

    const data = await response.json();
    if (typeof data.credits === "number") {
      setCredits(data.credits);
    }
    if (data.user) {
      setUserProfile(data.user);
    }
    return data.user;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      stopListening();

      setCurrentUser(user);

      if (!user) {
        setCredits(0);
        setUserProfile(null);
        setCreditsReady(true);
        return;
      }

      setCreditsReady(false);

      syncUserCredits(user).finally(() => {
        if (!unsubscribeRef.current && user) {
          setCreditsReady(true);
        }
      });

      unsubscribeRef.current = onSnapshot(
        doc(db, "registered_users", user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const snapshotCredits = Number(data?.credits || 0);
            setCredits(Number.isFinite(snapshotCredits) ? snapshotCredits : 0);
            setUserProfile({
              uid: user.uid,
              name: data?.name || user.displayName || user.email?.split("@")[0] || "",
              email: data?.email || user.email || "",
              dob: data?.dob || "",
              age: data?.age || 0,
              location: data?.location || "",
              bio: data?.bio || "",
            });
          } else {
            setUserProfile({
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "",
              email: user.email || "",
              dob: "",
              age: 0,
              location: "",
              bio: "",
            });
          }
          setCreditsReady(true);
        },
        (error) => {
          console.error("Failed to load credits from Firestore:", error);
          setCreditsReady(true);
        },
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => () => stopListening(), []);

  const value = useMemo(
    () => ({
      currentUser,
      credits,
      setCredits,
      creditsReady,
      userProfile,
      updateProfileData,
      signIn: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      signUp: (email, password) =>
        createUserWithEmailAndPassword(auth, email, password),
      signInWithGoogle: () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
      },
      signOut: () => signOut(auth),
      changePassword: (newPassword) => {
        if (!auth.currentUser) throw new Error("No user logged in.");
        return updatePassword(auth.currentUser, newPassword);
      },
    }),
    [currentUser, credits, creditsReady, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
