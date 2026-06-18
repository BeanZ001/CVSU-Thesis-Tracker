import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PdfAnnotator from "../components/PdfAnnotator";

const API_URL = "http://localhost/myapp/upload_api.php";

const STATUS_CONFIG = {
  unchecked: {
    label: "Unchecked", icon: "🕐", color: "#8b8fa8",
    bg: "rgba(139,143,168,0.12)", border: "rgba(139,143,168,0.3)",
    desc: "Your file is waiting to be reviewed.",
  },
  reviewing: {
    label: "Reviewing", icon: "🔍", color: "#ffb347",
    bg: "rgba(255,179,71,0.12)", border: "rgba(255,179,71,0.35)",
    desc: "An admin is currently reviewing your file.",
  },
  passed: {
    label: "Passed", icon: "✅", color: "#4caf82",
    bg: "rgba(76,175,130,0.12)", border: "rgba(76,175,130,0.35)",
    desc: "Your file has been reviewed and approved.",
  },
  need_revisions: {
    label: "Need Revisions", icon: "✏️", color: "#ff6b6b",
    bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.35)",
    desc: "Revisions requested. See feedback and annotations below.",
  },
};

function StatusBadge({ status, large }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unchecked;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: large ? 8 : 5,
      padding: large ? "7px 16px" : "4px 11px",
      borderRadius: 20, fontSize: large ? 14 : 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`, whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function PdfViewerPage() {
  const { fileId }     = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const fileName   = searchParams.get("name")   ?? "Document";
  const storedName = searchParams.get("stored")  ?? "";
  const initStatus = searchParams.get("status")  ?? "unchecked";
  const sentTo     = searchParams.get("sentTo")  ?? "—";

  const [status,      setStatus]      = useState(initStatus);
  const [feedbackLog, setFeedbackLog] = useState([]);
  const [loadingLog,  setLoadingLog]  = useState(true);
  const [panelOpen,   setPanelOpen]   = useState(true);

  const pdfUrl = storedName
    ? `http://localhost/myapp/upload_api.php?action=serve_pdf&stored=${encodeURIComponent(storedName)}`
    : null;

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unchecked;

  useEffect(() => {
    fetchFeedback();
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res  = await fetch(
        `${API_URL}?action=list&username=${encodeURIComponent(user?.username)}&role=${encodeURIComponent(user?.role)}`
      );
      const data = await res.json();
      if (data.success) {
        const match = data.files.find(f => String(f.id) === String(fileId));
        if (match) setStatus(match.status ?? "unchecked");
      }
    } catch {  }
  };

  const fetchFeedback = async () => {
    setLoadingLog(true);
    try {
      const res  = await fetch(`${API_URL}?action=get_feedback&file_id=${fileId}`);
      const data = await res.json();
      if (data.success) setFeedbackLog(data.feedback ?? []);
    } catch {  }
    finally { setLoadingLog(false); }
  };

  return (
    <div className="viewer-root" style={{ "--status-color": cfg.color, "--status-bg": cfg.bg }}>

      {}
      <header className="viewer-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="topbar-center">
          <span className="topbar-fileicon">📄</span>
          <div className="topbar-fileinfo">
            <span className="topbar-filename">{fileName}</span>
            <span className="topbar-meta">Sent to <strong>{sentTo}</strong></span>
          </div>
        </div>

        <div className="topbar-right">
          <StatusBadge status={status} large />
          <button
            className="toggle-panel-btn"
            onClick={() => setPanelOpen(o => !o)}
            title={panelOpen ? "Hide panel" : "Show panel"}
          >
            {panelOpen ? "Hide Feedback ›" : "‹ Show Feedback"}
          </button>
        </div>
      </header>

      {}
      <div className="viewer-body">

        {}
        <section className="pdf-section">
          {pdfUrl ? (
            <PdfAnnotator
              pdfUrl={pdfUrl}
              fileId={fileId}
              user={user}
              readOnly={true}
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
        {panelOpen && (
          <aside className="feedback-panel">

            {}
            <div className="status-card" style={{ borderColor: cfg.border, background: cfg.bg }}>
              <div className="status-card-label">Current Status</div>
              <StatusBadge status={status} large />
              <p className="status-card-desc">{cfg.desc}</p>
            </div>

            {}
            <div style={{
              margin: "0 16px 12px",
              padding: "10px 14px",
              background: "rgba(80,160,255,0.08)",
              border: "1px solid rgba(80,160,255,0.25)",
              borderRadius: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.5,
            }}>
              💡 Scroll the PDF to see your admin's highlights, underlines, and comment pins.
              Hover over a 💬 pin to read the note.
            </div>

            {/* Feedback */}
            <div className="feedback-header">
              <span className="feedback-title">💬 Teacher Feedback</span>
              <button className="refresh-btn" onClick={fetchFeedback} title="Refresh">↻</button>
            </div>

            <div className="feedback-body">
              {loadingLog ? (
                <div className="feedback-empty">
                  <span className="spinner" /> Loading feedback…
                </div>
              ) : feedbackLog.length === 0 ? (
                <div className="feedback-empty">
                  <span style={{ fontSize: 32 }}>📭</span>
                  <p>No written feedback yet.</p>
                  <p className="feedback-empty-sub">
                    Check the PDF for annotation highlights and comment pins.
                  </p>
                </div>
              ) : (
                <div className="feedback-list">
                  {feedbackLog.map((entry, i) => (
                    <div key={i} className="feedback-entry">
                      <div className="entry-header">
                        <span className="entry-admin">🛡️ {entry.admin}</span>
                        <span className="entry-date">
                          {new Date(entry.created_at).toLocaleString(undefined, {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.file_status && <StatusBadge status={entry.file_status} />}
                      <p className="entry-message">{entry.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .viewer-root {
          display: flex; flex-direction: column;
          height: 100vh; overflow: hidden;
          background: var(--bg); color: var(--text);
          font-family: var(--font-body);
        }

        .viewer-topbar {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px;
          background: var(--panel); border-bottom: 1px solid var(--border);
          flex-shrink: 0; flex-wrap: wrap;
        }
        .back-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 13px; font-weight: 600; padding: 7px 13px;
          border-radius: 8px; cursor: pointer; transition: all 0.18s; white-space: nowrap;
        }
        .back-btn:hover { color: var(--text); border-color: var(--text); }

        .topbar-center { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .topbar-fileicon { font-size: 22px; flex-shrink: 0; }
        .topbar-fileinfo { display: flex; flex-direction: column; min-width: 0; }
        .topbar-filename {
          font-family: var(--font-head); font-weight: 700; font-size: 15px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .topbar-meta { font-size: 12px; color: var(--muted); }

        .topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .toggle-panel-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 12px; font-weight: 600; padding: 6px 12px;
          border-radius: 8px; cursor: pointer; transition: all 0.18s; white-space: nowrap;
        }
        .toggle-panel-btn:hover { color: var(--role-color, var(--accent)); border-color: var(--role-color, var(--accent)); }

        .viewer-body { display: flex; flex: 1; overflow: hidden; }

        .pdf-section {
          flex: 1; display: flex; flex-direction: column; overflow: hidden;
        }

        .pdf-missing {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: var(--muted); font-size: 15px; text-align: center;
          background: #1a1a1a; line-height: 1.6;
        }

        .feedback-panel {
          width: 300px; flex-shrink: 0; display: flex; flex-direction: column;
          background: var(--bg); border-left: 1px solid var(--border); overflow: hidden;
        }

        .status-card {
          margin: 16px 16px 12px; padding: 14px 16px;
          border-radius: 12px; border: 1px solid;
          display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
        }
        .status-card-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.7px; color: var(--muted);
        }
        .status-card-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

        .feedback-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px 10px; flex-shrink: 0; border-bottom: 1px solid var(--border);
        }
        .feedback-title { font-size: 13px; font-weight: 700; color: var(--text); }
        .refresh-btn {
          background: transparent; border: none; color: var(--muted);
          font-size: 16px; cursor: pointer; padding: 2px 6px;
          border-radius: 4px; transition: all 0.18s;
        }
        .refresh-btn:hover { color: var(--text); background: var(--panel); }

        .feedback-body { flex: 1; overflow-y: auto; padding: 14px 16px; }
        .feedback-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; height: 100%; min-height: 140px;
          color: var(--muted); text-align: center; font-size: 14px;
        }
        .feedback-empty-sub { font-size: 12px; max-width: 200px; line-height: 1.5; }

        .spinner {
          display: inline-block; width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--role-color, var(--accent));
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .feedback-list { display: flex; flex-direction: column; gap: 12px; }
        .feedback-entry {
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 7px;
        }
        .feedback-entry:first-child { border-color: var(--status-color, var(--border)); }

        .entry-header {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 4px;
        }
        .entry-admin { font-size: 12px; font-weight: 700; color: var(--role-color, var(--accent)); }
        .entry-date  { font-size: 11px; color: var(--muted); }
        .entry-message { font-size: 13px; line-height: 1.65; color: var(--text); white-space: pre-wrap; word-break: break-word; }

        @media (max-width: 768px) {
          .viewer-body { flex-direction: column; }
          .pdf-section { height: 55vh; flex: none; }
          .feedback-panel { width: 100%; flex: 1; border-left: none; border-top: 1px solid var(--border); }
          .toggle-panel-btn { display: none; }
        }
      `}</style>
    </div>
  );
}
