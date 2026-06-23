import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function getReadableAuthError(error) {
  if (!error) return "Authentication failed.";
  const code = error.code;
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address. Please check and try again.";
    case "auth/user-not-found":
      return "User does not exist. Please check your email or sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "This email is already in use. Please log in.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please recheck.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed. Please try again.";
    default:
      return error.message?.replace(/^Firebase:\s*/, "") || "Authentication failed.";
  }
}

export default function AuthModal({ onClose, onAuthSuccess }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let credential;
      if (mode === "login") {
        credential = await signIn(email, password);
      } else {
        credential = await signUp(email, password);
      }
      onAuthSuccess?.(credential?.user);
      onClose?.();
    } catch (authError) {
      setError(getReadableAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithGoogle();
      onAuthSuccess?.(credential?.user);
      onClose?.();
    } catch (authError) {
      setError(getReadableAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close-btn" type="button" onClick={onClose}>
          ×
        </button>
        <h2 id="auth-modal-title">{mode === "login" ? "Log in" : "Sign up"}</h2>
        
        {error ? <p className="error">{error}</p> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="name@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button 
          type="button" 
          className="google-auth-btn" 
          onClick={handleGoogleSignIn} 
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: "0.25rem" }}>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.505.453 3.44 1.346l2.582-2.58C13.463 1.077 11.427 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <button
          type="button"
          className="auth-toggle"
          onClick={() =>
            setMode((current) => (current === "login" ? "signup" : "login"))
          }
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already registered? Log in"}
        </button>
      </div>
    </div>
  );
}
