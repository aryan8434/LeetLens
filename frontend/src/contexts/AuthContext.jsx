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
        throw new Error("Failed to sync user credits.");
      }

      const data = await response.json();
      if (typeof data.credits === "number") {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error("Credit sync failed:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      stopListening();

      setCurrentUser(user);

      if (!user) {
        setCredits(0);
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
            const snapshotCredits = Number(snapshot.data()?.credits || 0);
            setCredits(Number.isFinite(snapshotCredits) ? snapshotCredits : 0);
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
      signIn: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      signUp: (email, password) =>
        createUserWithEmailAndPassword(auth, email, password),
      signOut: () => signOut(auth),
    }),
    [currentUser, credits, creditsReady],
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
