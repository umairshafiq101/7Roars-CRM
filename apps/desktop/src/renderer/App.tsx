import React, { useState, useEffect } from "react";
import Login from "./Login";
import Timer from "./Timer";

type View = "loading" | "login" | "timer";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) {
      setError("electronAPI not available — preload script may have failed to load");
      console.error("window.electronAPI is undefined");
      return;
    }

    checkAuth();

    const unsubscribe = window.electronAPI.onAuthRequired(() => {
      setView("login");
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const session = await window.electronAPI.getSession();
      if (session) {
        setView("timer");
      } else {
        setView("login");
      }
    } catch (err) {
      console.error("checkAuth error:", err);
      setView("login");
    }
  }

  if (error) {
    return (
      <div style={{ ...styles.container, color: "#ef4444", flexDirection: "column", gap: 8 }}>
        <div style={styles.logo}>7R</div>
        <p style={{ fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrapper}>
          <div style={styles.logo}>7R</div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (view === "login") {
    return <Login onSuccess={() => setView("timer")} />;
  }

  return (
    <Timer
      onLogout={() => setView("login")}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  },
  loadingWrapper: {
    textAlign: "center",
  },
  logo: {
    fontSize: 48,
    fontWeight: 800,
    color: "#6366f1",
    marginBottom: 16,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
};
