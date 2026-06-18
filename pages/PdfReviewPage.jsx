import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PdfAnnotator from "../components/PdfAnnotator";

const API_URL = "http://localhost/myapp/upload_api.php";

const STATUS_CONFIG = {
  unchecked: {
    label: "Unchecked", icon: "🕐", color: "#8b8fa8",
    bg: "rgba(139,143,168,0.12)", border: "rgba(139,143,168,0.3)",
  },
  reviewing: {
    label: "Reviewing", icon: "🔍", color: "#ffb347",
    bg: "rgba(255,179,71,0.12)", border: "rgba(255,179,71,0.35)",
  },
  passed: {
    label: "Passed", icon: "✅", color: "#4caf82",
    bg: "rgba(76,175,130,0.12)", border: "rgba(76,175,130,0.35)",
  },
  need_revisions: {
    label: "Need Revisions", icon: "✏️", color: "#ff6b6b",
    bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.35)",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unchecked;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 14px", borderRadius: 20,
      fontSize: 13, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function PdfReviewPage() {
  const { fileId }     = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const fileName   = searchParams.get("name")     ?? "Document";
  const uploader   = searchParams.get("uploader") ?? "—";
  const initStatus = searchParams.get("status")   ?? "unchecked";
  const storedName = searchParams.get("stored")   ?? "";

  const [status,      setStatus]      = useState(initStatus);
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [toast,       setToast]       = useState(null);
  const [panelTab,    setPanelTab]    = useState("review");
  const [feedbackLog, setFeedbackLog] = useState([]);
  const [loadingLog,  setLoadingLog]  = useState(false);
  const [approvedToDb, setApprovedToDb] = useState(false);
  const [approvingDb,  setApprovingDb]  = useState(false);

  const pdfUrl = storedName
    ? `http://localhost/myapp/upload_api.php?action=serve_pdf&stored=${encodeURIComponent(storedName)}`
    : null;

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (panelTab === "history") fetchHistory();
  }, [panelTab]);

  const fetchHistory = async () => {
    setLoadingLog(true);
    try {
      const res  = await fetch(`${API_URL}?action=get_feedback&file_id=${fileId}`);
      const data = await res.json();
      if (data.success) setFeedbackLog(data.feedback ?? []);
    } catch {  }
    finally { setLoadingLog(false); }
  };

  const handleStatusUpdate = async (newStatus) => {
    setSaving(true);
    try {
      const res  = await fetch(API_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action   : "update_status",
          id       : fileId,
          status   : newStatus,
          username : user?.username,
          role     : user?.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(newStatus);
        showToast(`Status set to "${STATUS_CONFIG[newStatus]?.label}".`);
      } else {
        showToast(data.message ?? "Could not update status.", "error");
      }
    } catch {
      showToast("Server error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveToDb = async () => {
    setApprovingDb(true);
    try {
      const res  = await fetch(API_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action   : "approve_to_db",
          file_id  : fileId,
          username : user?.username,
          role     : user?.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovedToDb(true);
        showToast("File added to the main database.");
      } else {
        showToast(data.message ?? "Could not approve file.", "error");
        if (data.message?.includes("already")) setApprovedToDb(true);
      }
    } catch {
      showToast("Server error.", "error");
    } finally {
      setApprovingDb(false);
    }
  };

  const handleSendNote = async () => {
    if (!notes.trim()) return;
    setSendingNote(true);
    try {
      const res  = await fetch(API_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action      : "send_feedback",
          file_id     : fileId,
          admin       : user?.username,
          recipient   : uploader,
          message     : notes.trim(),
          file_status : status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Feedback sent to student.");
        setNotes("");
        fetchHistory();
      } else {
        showToast(data.message ?? "Could not send feedback.", "error");
      }
    } catch {
      showToast("Server error.", "error");
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="review-root">

      {}
      <header className="review-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="topbar-file">
          <span className="topbar-icon">📄</span>
          <div>
            <div className="topbar-filename">{fileName}</div>
            <div className="topbar-meta">
              Submitted by <strong>{uploader}</strong>
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <StatusBadge status={status} />
        </div>
      </header>

      {}
      <div className="review-body">

        {}
        <section className="pdf-section">
          {pdfUrl ? (
            <PdfAnnotator
              pdfUrl={pdfUrl}
              fileId={fileId}
              user={user}
              readOnly={false}
              apiUrl={API_URL}
            />
          ) : (
            <div className="pdf-missing">
              <span style={{ fontSize: 56 }}>📄</span>
              <p>PDF not available.<br />Go back and try again.</p>
            </div>
          )}
        </section>

        {}
        <aside className="review-panel">

          {}
          <div className="panel-tabs">
            {["review", "history"].map(tab => (
              <button
                key={tab}
                className={`panel-tab ${panelTab === tab ? "active" : ""}`}
                onClick={() => setPanelTab(tab)}
              >
                {tab === "review" ? "⚙️ Review" : "📋 History"}
              </button>
            ))}
          </div>

          <div className="panel-content">

            {}
            {panelTab === "review" && (
              <>
                {}
                <div className="panel-section">
                  <div className="panel-label">Set Status</div>
                  <div className="status-actions">
                    {[
                      { key: "reviewing",      cls: "reviewing", icon: "🔍", title: "Mark as Reviewing",     sub: "You are currently looking at this." },
                      { key: "passed",         cls: "passed",    icon: "✅", title: "Mark as Passed",        sub: "File meets requirements."          },
                      { key: "need_revisions", cls: "revision",  icon: "✏️", title: "Request Revisions",     sub: "Student needs to make changes."    },
                    ].map(({ key, cls, icon, title, sub }) => (
                      <button
                        key={key}
                        disabled={saving || status === key}
                        onClick={() => handleStatusUpdate(key)}
                        className={`status-action-btn ${cls} ${status === key ? "active" : ""}`}
                      >
                        <span className="sa-icon">{icon}</span>
                        <span className="sa-text">
                          <strong>{title}</strong>
                          <small>{sub}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              

                {}
                <div className="panel-section">
                  <div className="panel-label">Main Database</div>
                  <button
                    className={`db-approve-btn ${approvedToDb ? "approved" : ""}`}
                    disabled={approvingDb || approvedToDb}
                    onClick={handleApproveToDb}
                  >
                    {approvedToDb
                      ? "✅ Added to Main Database"
                      : approvingDb
                        ? "Uploading…"
                        : "🗄️ Upload to Main Database"}
                  </button>
                  {!approvedToDb && (
                    <small className="db-hint">
                      Permanently stores this file in the shared main database.
                    </small>
                  )}
                </div>

                {}
                <div className="panel-section feedback-section">
                  <div className="panel-label">Written Feedback</div>
                  <textarea
                    className="feedback-textarea"
                    placeholder={`Write feedback for ${uploader}…`}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={6}
                  />
                  <button
                    className="send-btn"
                    disabled={sendingNote || !notes.trim()}
                    onClick={handleSendNote}
                  >
                    {sendingNote ? "Sending…" : `Send Feedback to ${uploader} →`}
                  </button>
                </div>
              </>
            )}

            {}
            {panelTab === "history" && (
              <div className="panel-section">
                <div className="panel-label">Feedback Sent</div>
                {loadingLog ? (
                  <p className="history-empty">Loading…</p>
                ) : feedbackLog.length === 0 ? (
                  <p className="history-empty">No feedback sent yet.</p>
                ) : (
                  <div className="history-list">
                    {feedbackLog.map((entry, i) => (
                      <div key={i} className="history-entry">
                        <div className="history-header">
                          <span className="history-admin">🛡️ {entry.admin}</span>
                          <span className="history-date">
                            {new Date(entry.created_at).toLocaleString(undefined, {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {entry.file_status && <StatusBadge status={entry.file_status} />}
                        <p className="history-message">{entry.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {}
      {toast && (
        <div className={`review-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.text}
        </div>
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .review-root {
          display: flex; flex-direction: column;
          height: 100vh; overflow: hidden;
          background: var(--bg); color: var(--text);
          font-family: var(--font-body);
        }

        .review-topbar {
          display: flex; align-items: center; gap: 16px;
          padding: 12px 20px;
          background: var(--panel); border-bottom: 1px solid var(--border);
          flex-shrink: 0; flex-wrap: wrap;
        }
        .back-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 13px; font-weight: 600; padding: 7px 14px;
          border-radius: 8px; cursor: pointer; transition: all 0.18s; white-space: nowrap;
        }
        .back-btn:hover { color: var(--text); border-color: var(--text); }

        .topbar-file { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .topbar-icon { font-size: 22px; flex-shrink: 0; }
        .topbar-filename {
          font-family: var(--font-head); font-weight: 700; font-size: 15px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .topbar-meta { font-size: 12px; color: var(--muted); }

        .review-body { display: flex; flex: 1; overflow: hidden; }

        .pdf-section {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; border-right: 1px solid var(--border);
        }

        .pdf-missing {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: var(--muted); font-size: 15px; text-align: center;
          background: #1a1a1a; line-height: 1.6;
        }

        .review-panel {
          width: 320px; flex-shrink: 0; display: flex;
          flex-direction: column; background: var(--bg); overflow: hidden;
        }

        .panel-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .panel-tab {
          flex: 1; padding: 13px 8px;
          background: transparent; border: none; color: var(--muted);
          font-family: var(--font-body); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.18s; border-bottom: 2px solid transparent;
        }
        .panel-tab:hover { color: var(--text); }
        .panel-tab.active {
          color: var(--role-color, #e8ff47);
          border-bottom-color: var(--role-color, #e8ff47);
        }

        .panel-content {
          flex: 1; overflow-y: auto; padding: 18px 16px;
          display: flex; flex-direction: column; gap: 22px;
        }

        .panel-section { display: flex; flex-direction: column; gap: 10px; }
        .panel-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.6px; color: var(--muted);
        }

        .status-actions { display: flex; flex-direction: column; gap: 8px; }
        .status-action-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--panel);
          color: var(--text); font-family: var(--font-body);
          cursor: pointer; transition: all 0.18s; text-align: left; width: 100%;
        }
        .status-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .status-action-btn:not(:disabled):hover { transform: translateX(2px); }
        .sa-icon { font-size: 20px; flex-shrink: 0; }
        .sa-text { display: flex; flex-direction: column; gap: 1px; }
        .sa-text strong { font-size: 13px; font-weight: 700; }
        .sa-text small  { font-size: 11px; color: var(--muted); }

        .status-action-btn.reviewing:not(:disabled):hover,
        .status-action-btn.reviewing.active { border-color: #ffb347; background: rgba(255,179,71,0.1); color: #ffb347; }
        .status-action-btn.reviewing.active { opacity: 0.65; cursor: default; }

        .status-action-btn.passed:not(:disabled):hover,
        .status-action-btn.passed.active { border-color: #4caf82; background: rgba(76,175,130,0.1); color: #4caf82; }
        .status-action-btn.passed.active { opacity: 0.65; cursor: default; }

        .status-action-btn.revision:not(:disabled):hover,
        .status-action-btn.revision.active { border-color: #ff6b6b; background: rgba(255,107,107,0.1); color: #ff6b6b; }
        .status-action-btn.revision.active { opacity: 0.65; cursor: default; }

        .feedback-section { flex: 1; }

        .db-approve-btn {
          width: 100%; padding: 12px 16px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text);
          font-family: var(--font-body); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s; text-align: center;
        }
        .db-approve-btn:hover:not(:disabled):not(.approved) {
          border-color: #7c9eff; color: #7c9eff;
          background: rgba(124,158,255,0.08);
          transform: translateY(-1px);
        }
        .db-approve-btn.approved {
          border-color: #4caf82; color: #4caf82;
          background: rgba(76,175,130,0.08);
          cursor: default; opacity: 0.8;
        }
        .db-approve-btn:disabled:not(.approved) { opacity: 0.45; cursor: not-allowed; }
        .db-hint { font-size: 11px; color: var(--muted); line-height: 1.5; }
        .feedback-textarea {
          width: 100%; padding: 12px 14px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text);
          font-family: var(--font-body); font-size: 13px;
          line-height: 1.6; resize: vertical; transition: border-color 0.18s;
          min-height: 110px;
        }
        .feedback-textarea::placeholder { color: var(--muted); }
        .feedback-textarea:focus { outline: none; border-color: var(--role-color, #e8ff47); }

        .send-btn {
          width: 100%; padding: 12px 16px;
          background: var(--role-color, #e8ff47); color: #111;
          border: none; border-radius: 10px;
          font-family: var(--font-body); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .send-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .history-empty { color: var(--muted); font-size: 13px; }
        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-entry {
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .history-header {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 4px;
        }
        .history-admin { font-size: 12px; font-weight: 700; color: var(--role-color, #e8ff47); }
        .history-date  { font-size: 11px; color: var(--muted); }
        .history-message { font-size: 13px; line-height: 1.6; color: var(--text); white-space: pre-wrap; }

        .review-toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          padding: 12px 22px; border-radius: 40px;
          font-size: 13px; font-weight: 600; font-family: var(--font-body);
          z-index: 9999; pointer-events: none; white-space: nowrap;
        }
        .toast-success { background: rgba(76,175,130,0.15); border: 1px solid #4caf82; color: #4caf82; }
        .toast-error   { background: rgba(255,107,107,0.15); border: 1px solid #ff6b6b; color: #ff6b6b; }

        @media (max-width: 768px) {
          .review-body { flex-direction: column; }
          .pdf-section { height: 55vh; flex: none; border-right: none; border-bottom: 1px solid var(--border); }
          .review-panel { width: 100%; flex: 1; }
        }
      `}</style>
    </div>
  );
}
