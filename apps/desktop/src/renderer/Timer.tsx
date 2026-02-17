import React, { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TimerProps {
  onLogout: () => void;
}

interface SyncStatusData {
  connected: boolean;
  queueSize: number;
  lastSyncAt: string | null;
}

export default function Timer({ onLogout }: TimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);

  // Idle detection state
  const [idleAlert, setIdleAlert] = useState<{ idleSeconds: number } | null>(null);

  // Sync/connection status
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({
    connected: true,
    queueSize: 0,
    lastSyncAt: null,
  });

  // Power event notification
  const [powerNotice, setPowerNotice] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const [state, session, projectList, syncSt] = await Promise.all([
        window.electronAPI.getTimerState(),
        window.electronAPI.getSession(),
        window.electronAPI.getProjects(),
        window.electronAPI.getSyncStatus(),
      ]);

      setIsRunning(state.isRunning);
      setElapsed(state.elapsed);
      if (state.projectId) setSelectedProject(state.projectId);
      if (state.description) setDescription(state.description);
      if (session?.user?.name) setUserName(session.user.name);
      setProjects(projectList || []);
      if (syncSt) setSyncStatus(syncSt);
    } catch (err) {
      console.error("Failed to load state:", err);
    }
  }, []);

  useEffect(() => {
    loadState();

    const unsubTick = window.electronAPI.onTimerTick((newElapsed, running) => {
      setElapsed(newElapsed);
      if (running !== undefined) setIsRunning(running);
    });

    const unsubStarted = window.electronAPI.onTimerStarted(() => {
      setIsRunning(true);
    });

    const unsubStopped = window.electronAPI.onTimerStopped(() => {
      setIsRunning(false);
      setElapsed(0);
      setIdleAlert(null);
    });

    const unsubScreenshot = window.electronAPI.onScreenshotCaptured(() => {
      setLastScreenshot("captured");
      setTimeout(() => setLastScreenshot(null), 3000);
    });

    const unsubIdle = window.electronAPI.onIdleDetected((data) => {
      setIdleAlert(data);
    });

    const unsubIdleAutoStop = window.electronAPI.onIdleAutoStop(() => {
      setIdleAlert(null);
      setIsRunning(false);
      setElapsed(0);
    });

    const unsubSync = window.electronAPI.onSyncStatus((data) => {
      setSyncStatus(data);
    });

    const unsubPower = window.electronAPI.onPowerEvent((event) => {
      if (event === "power:locked" || event === "power:suspended") {
        setIsRunning(false);
        setElapsed(0);
        setPowerNotice("Timer stopped — system locked/suspended");
        setTimeout(() => setPowerNotice(null), 5000);
      } else if (event === "power:unlocked" || event === "power:resumed") {
        setPowerNotice("System unlocked — start timer to resume tracking");
        setTimeout(() => setPowerNotice(null), 5000);
      }
    });

    return () => {
      unsubTick();
      unsubStarted();
      unsubStopped();
      unsubScreenshot();
      unsubIdle();
      unsubIdleAutoStop();
      unsubSync();
      unsubPower();
    };
  }, [loadState]);

  async function handleStart() {
    setError("");
    try {
      const result = await window.electronAPI.startTimer({
        projectId: selectedProject || undefined,
        description: description || undefined,
      });
      if (result.success) {
        setIsRunning(true);
      } else {
        setError(result.error || "Failed to start timer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  }

  async function handleStop() {
    setError("");
    try {
      const result = await window.electronAPI.stopTimer();
      if (result.success) {
        setIsRunning(false);
        setElapsed(0);
        setIdleAlert(null);
      } else {
        setError(result.error || "Failed to stop timer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop");
    }
  }

  async function handleLogout() {
    if (isRunning) {
      await handleStop();
    }
    await window.electronAPI.logout();
    onLogout();
  }

  async function handleIdleDismiss() {
    setIdleAlert(null);
    await window.electronAPI.idleDismiss();
  }

  async function handleIdleDiscard() {
    setIdleAlert(null);
    await window.electronAPI.idleDiscard();
    setIsRunning(false);
    setElapsed(0);
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  return (
    <div style={styles.container}>
      {/* Idle Alert Overlay */}
      {idleAlert && (
        <div style={styles.idleOverlay}>
          <div style={styles.idleDialog}>
            <div style={styles.idleIcon}>💤</div>
            <div style={styles.idleTitle}>You've been idle</div>
            <div style={styles.idleMessage}>
              No activity for {Math.floor(idleAlert.idleSeconds / 60)} minutes.
            </div>
            <div style={styles.idleButtons}>
              <button onClick={handleIdleDismiss} style={styles.idleKeepBtn}>
                Keep Time
              </button>
              <button onClick={handleIdleDiscard} style={styles.idleDiscardBtn}>
                Discard & Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>7R</span>
          <span style={styles.headerTitle}>7Roars Agent</span>
        </div>
      </div>

      {/* User greeting + logout */}
      <div style={styles.greeting}>
        <div style={styles.greetingLeft}>
          <span style={styles.greetingText}>
            {userName ? `Hello, ${userName}` : "Hello"}
          </span>
          <span
            style={{
              ...styles.statusDot,
              background: isRunning ? "#22c55e" : "#64748b",
            }}
          />
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </div>

      {/* Timer display */}
      <div style={styles.timerSection}>
        <div
          style={{
            ...styles.timerDisplay,
            color: isRunning ? "#6366f1" : "#64748b",
          }}
        >
          {formatTime(elapsed)}
        </div>

        {selectedProjectData && (
          <div style={styles.projectBadge}>
            <span
              style={{
                ...styles.projectDot,
                background: selectedProjectData.color,
              }}
            />
            {selectedProjectData.name}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {!isRunning && (
          <>
            <div style={styles.field}>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={styles.select}
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                style={styles.input}
              />
            </div>
          </>
        )}

        <button
          onClick={isRunning ? handleStop : handleStart}
          style={{
            ...styles.timerButton,
            background: isRunning
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #6366f1, #4f46e5)",
          }}
        >
          {isRunning ? "⏹ Stop Timer" : "▶ Start Timer"}
        </button>
      </div>

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Screenshot notification */}
      {lastScreenshot && (
        <div style={styles.screenshotNotice}>📸 Screenshot captured</div>
      )}

      {/* Power event notification */}
      {powerNotice && (
        <div style={styles.powerNotice}>{powerNotice}</div>
      )}

      {/* Status bar with connection indicator */}
      <div style={styles.statusBar}>
        <div style={styles.statusLeft}>
          <span
            style={{
              ...styles.syncDot,
              background: syncStatus.connected ? "#22c55e" : "#ef4444",
            }}
          />
          <span style={styles.statusText}>
            {isRunning ? "Tracking active" : "Idle"}
          </span>
        </div>
        {syncStatus.queueSize > 0 && (
          <span style={styles.queueText}>
            {syncStatus.queueSize} queued
          </span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #1e293b",
    WebkitAppRegion: "drag",
  } as unknown as React.CSSProperties,
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    color: "#6366f1",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
  },
  logoutBtn: {
    background: "none",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#94a3b8",
    fontSize: 11,
    padding: "4px 10px",
    cursor: "pointer",
    WebkitAppRegion: "no-drag",
  } as unknown as React.CSSProperties,
  greeting: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 0",
  },
  greetingLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: 500,
    color: "#e2e8f0",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  timerSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 16px 24px",
    gap: 12,
  },
  timerDisplay: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
    letterSpacing: 2,
    transition: "color 0.3s",
  },
  projectBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 12,
    background: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    fontSize: 12,
    color: "#a5b4fc",
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "0 16px",
    flex: 1,
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
  },
  timerButton: {
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "transform 0.1s, opacity 0.2s",
    letterSpacing: "0.02em",
  },
  error: {
    margin: "8px 16px",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    fontSize: 12,
  },
  screenshotNotice: {
    margin: "8px 16px",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#22c55e",
    fontSize: 12,
    textAlign: "center",
  },
  powerNotice: {
    margin: "8px 16px",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "#eab308",
    fontSize: 12,
    textAlign: "center",
  },
  statusBar: {
    padding: "10px 16px",
    borderTop: "1px solid #1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    color: "#64748b",
  },
  queueText: {
    fontSize: 10,
    color: "#94a3b8",
    background: "rgba(148, 163, 184, 0.1)",
    padding: "2px 6px",
    borderRadius: 4,
  },
  // Idle dialog styles
  idleOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  idleDialog: {
    background: "#1e293b",
    borderRadius: 16,
    padding: "24px",
    width: "85%",
    maxWidth: 320,
    textAlign: "center" as const,
    border: "1px solid #334155",
  },
  idleIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: 8,
  },
  idleMessage: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 20,
  },
  idleButtons: {
    display: "flex",
    gap: 10,
  },
  idleKeepBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "transparent",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  idleDiscardBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
