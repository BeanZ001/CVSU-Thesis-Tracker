

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";

const AUTH_API = "http://localhost/myapp/auth_api.php";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwError,    setPwError]    = useState("");
  const [pwSuccess,  setPwSuccess]  = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess("");

    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw === currentPw) {
      setPwError("New password must be different from the current one.");
      return;
    }

    setPwLoading(true);
    try {
      const res  = await fetch(AUTH_API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:           "change_password",
          username:         user?.username,
          current_password: currentPw,
          new_password:     newPw,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess("Password changed successfully.");
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwError(data.message ?? "Failed to change password.");
      }
    } catch {
      setPwError("Could not reach the server.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="settings-page">

      {}
      <section className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-icon">🎨</span>
          <div>
            <h2 className="settings-section-title">Appearance</h2>
            <p className="settings-section-desc">
              Choose how Thesis_Tracker looks. Your preference is saved and persists across sessions.
            </p>
          </div>
        </div>

        <div className="theme-picker">
          <button
            className={`theme-card ${theme === "light" ? "theme-card--active" : ""}`}
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
          >
            <div className="theme-preview theme-preview--light">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar--wide" />
                <div className="tp-bar" />
                <div className="tp-bar tp-bar--short" />
              </div>
            </div>
            <div className="theme-card-footer">
              <span className="theme-card-check">{theme === "light" ? "✓" : ""}</span>
              <span className="theme-card-label">Light</span>
            </div>
          </button>

          <button
            className={`theme-card ${theme === "dark" ? "theme-card--active" : ""}`}
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
          >
            <div className="theme-preview theme-preview--dark">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar--wide" />
                <div className="tp-bar" />
                <div className="tp-bar tp-bar--short" />
              </div>
            </div>
            <div className="theme-card-footer">
              <span className="theme-card-check">{theme === "dark" ? "✓" : ""}</span>
              <span className="theme-card-label">Dark</span>
            </div>
          </button>
        </div>
      </section>

      {}
      <section className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-icon">🔑</span>
          <div>
            <h2 className="settings-section-title">Change Password</h2>
            <p className="settings-section-desc">
              Update your password. You'll need to enter your current password to confirm the change.
            </p>
          </div>
        </div>

        <div className="pw-form">
          {/* Current password */}
          <div className="pw-field">
            <label className="pw-label">Current password</label>
            <div className="pw-input-wrap">
              <input
                className="pw-input"
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPw}
                onChange={e => { setCurrentPw(e.target.value); setPwError(""); setPwSuccess(""); }}
                autoComplete="current-password"
              />
              <button type="button" className="pw-eye" onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="pw-field">
            <label className="pw-label">New password</label>
            <div className="pw-input-wrap">
              <input
                className="pw-input"
                type={showNew ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwError(""); setPwSuccess(""); }}
                autoComplete="new-password"
              />
              <button type="button" className="pw-eye" onClick={() => setShowNew(v => !v)}>
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
            {/* Strength bar */}
            {newPw.length > 0 && (
              <div className="pw-strength-wrap">
                <div className={`pw-strength-bar pw-strength-${getStrength(newPw)}`} />
                <span className="pw-strength-label">{getStrengthLabel(newPw)}</span>
              </div>
            )}
          </div>

          {/* Confirm new password */}
          <div className="pw-field">
            <label className="pw-label">Confirm new password</label>
            <div className="pw-input-wrap">
              <input
                className={`pw-input ${confirmPw && confirmPw !== newPw ? "pw-input--mismatch" : ""}`}
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setPwError(""); setPwSuccess(""); }}
                autoComplete="new-password"
              />
              <button type="button" className="pw-eye" onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <span className="pw-mismatch-hint">Passwords don't match</span>
            )}
          </div>

          {}
          {pwError   && <div className="pw-msg pw-msg--error">⚠️ {pwError}</div>}
          {pwSuccess && <div className="pw-msg pw-msg--success">✅ {pwSuccess}</div>}

          <button
            className="pw-submit-btn"
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading ? "Updating…" : "Update password"}
          </button>
        </div>
      </section>

      {}
      <section className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-icon">🔐</span>
          <div>
            <h2 className="settings-section-title">Authentication</h2>
            <p className="settings-section-desc">
              Configure session timeouts, password policies, and two-factor authentication requirements.
            </p>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span>Session timeout</span>
            <span className="settings-row-hint">Auto-logout after inactivity</span>
          </div>
          <select className="settings-select" disabled>
            <option>30 minutes</option>
            <option>1 hour</option>
            <option>4 hours</option>
          </select>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span>Minimum password length</span>
            <span className="settings-row-hint">Applied at registration</span>
          </div>
          <select className="settings-select" disabled>
            <option>8 characters</option>
            <option>12 characters</option>
          </select>
        </div>
      </section>

      {}
      <section className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-icon">🔔</span>
          <div>
            <h2 className="settings-section-title">Notifications</h2>
            <p className="settings-section-desc">
              Control when and how the platform sends email alerts to users and admins.
            </p>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span>Submission received</span>
            <span className="settings-row-hint">Email admin when student uploads</span>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" defaultChecked disabled />
            <span className="settings-toggle-track" />
          </label>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span>Review completed</span>
            <span className="settings-row-hint">Email student when admin reviews</span>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" defaultChecked disabled />
            <span className="settings-toggle-track" />
          </label>
        </div>
      </section>

      <style>{`
        /* ── Password section ── */
        .pw-form {
          display: flex; flex-direction: column; gap: 18px;
          max-width: 420px;
        }
        .pw-field { display: flex; flex-direction: column; gap: 6px; }
        .pw-label {
          font-size: 13px; font-weight: 600; color: var(--text);
        }
        .pw-input-wrap { position: relative; display: flex; align-items: center; }
        .pw-input {
          width: 100%; padding: 10px 42px 10px 14px;
          background: var(--panel); border: 1px solid var(--border); border-radius: 9px;
          color: var(--text); font-family: var(--font-body); font-size: 14px;
          outline: none; transition: border-color 0.18s, box-shadow 0.18s;
          box-sizing: border-box;
        }
        .pw-input:focus {
          border-color: var(--role-color, var(--accent));
          box-shadow: 0 0 0 3px rgba(232,255,71,0.1);
        }
        .pw-input--mismatch { border-color: #ff6b6b !important; }
        .pw-input::placeholder { color: var(--muted); }
        .pw-eye {
          position: absolute; right: 12px;
          background: none; border: none; cursor: pointer;
          font-size: 15px; padding: 0; line-height: 1;
          opacity: 0.6; transition: opacity 0.15s;
        }
        .pw-eye:hover { opacity: 1; }

        .pw-strength-wrap {
          display: flex; align-items: center; gap: 8px; margin-top: 4px;
        }
        .pw-strength-bar {
          height: 4px; border-radius: 4px; flex: 1;
          transition: background 0.3s, width 0.3s;
        }
        .pw-strength-weak   { background: #ff6b6b; width: 33%; }
        .pw-strength-medium { background: #ffb347; width: 66%; }
        .pw-strength-strong { background: #4caf82; width: 100%; }
        .pw-strength-label  { font-size: 11px; font-weight: 700; color: var(--muted); min-width: 48px; }

        .pw-mismatch-hint { font-size: 11px; color: #ff6b6b; font-weight: 600; }

        .pw-msg {
          font-size: 13px; font-weight: 600; padding: 10px 14px;
          border-radius: 8px; border: 1px solid;
        }
        .pw-msg--error   { color: #ff6b6b; background: rgba(255,107,107,0.08); border-color: rgba(255,107,107,0.3); }
        .pw-msg--success { color: #4caf82; background: rgba(76,175,130,0.08); border-color: rgba(76,175,130,0.3); }

        .pw-submit-btn {
          align-self: flex-start;
          padding: 10px 24px; border-radius: 9px; font-size: 14px; font-weight: 700;
          font-family: var(--font-body); cursor: pointer;
          background: var(--role-color, var(--accent)); color: #1a1a1a;
          border: none; transition: opacity 0.15s, transform 0.1s;
        }
        .pw-submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .pw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
}

function getStrength(pw) {
  if (pw.length < 6) return "weak";
  const hasUpper  = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (pw.length >= 10 && score >= 2) return "strong";
  if (pw.length >= 7  && score >= 1) return "medium";
  return "weak";
}

function getStrengthLabel(pw) {
  const s = getStrength(pw);
  return s === "strong" ? "Strong" : s === "medium" ? "Medium" : "Weak";
}
