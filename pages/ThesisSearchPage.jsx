

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

const API_URL = "http://localhost/myapp/upload_api.php";

const FIELD_OPTIONS = [
  { value: "all",    label: "All Fields", icon: "🔍" },
  { value: "title",  label: "Title",      icon: "📄" },
  { value: "author", label: "Author",     icon: "👤" },
];

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function Highlight({ text = "", query = "" }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: "rgba(232,255,71,0.35)", color: "inherit", borderRadius: 3, padding: "0 2px" }}>{p}</mark>
          : p
      )}
    </>
  );
}

export default function ThesisSearchPage() {
  const { user } = useAuth();

  const [query,    setQuery]    = useState("");
  const [field,    setField]    = useState("all");
  const [sort,     setSort]     = useState("newest"); 
  const [allData,  setAllData]  = useState([]);   
  const [results,  setResults]  = useState([]);   
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [deleting, setDeleting] = useState(null); 
  const [confirmId, setConfirmId] = useState(null); 
  const inputRef = useRef(null);

  
  useEffect(() => {
    inputRef.current?.focus();
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}?action=list_db`);
      const text = await res.text();                
      let data;
      try { data = JSON.parse(text); }
      catch { setError("Server returned invalid JSON. Check XAMPP is running and upload_api.php is in place."); setLoading(false); return; }

      if (data.success) {
        const entries = data.entries ?? [];
        setAllData(entries);
        setResults(entries);
      } else {
        setError(data.message ?? "API returned an error.");
      }
    } catch (e) {
      setError("Cannot reach the server. Make sure XAMPP is running and the app is at http://localhost/myapp/");
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const q = query.trim().toLowerCase();

    let filtered = allData.filter(entry => {
      if (!q) return true;
      const title  = (entry.original_name ?? "").toLowerCase();
      const author = (entry.uploaded_by   ?? "").toLowerCase();
      if (field === "title")  return title.includes(q);
      if (field === "author") return author.includes(q);
      return title.includes(q) || author.includes(q);
    });

    filtered = [...filtered].sort((a, b) => {
      const ta = new Date(a.approved_at ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.approved_at ?? b.created_at ?? 0).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });

    setResults(filtered);
  }, [query, field, sort, allData]);

  const handleView = (entry) => {
    window.open(
      `${API_URL}?action=serve_pdf&stored=${encodeURIComponent(entry.stored_name)}`,
      "_blank"
    );
  };

  const handleDeleteFromDb = async (entry) => {
    setDeleting(entry.id);
    setConfirmId(null);
    try {
      const res  = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:   "delete_from_db",
          id:       entry.id,
          username: user?.username,
          role:     user?.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAllData(prev => prev.filter(e => e.id !== entry.id));
      } else {
        setError(data.message ?? "Failed to delete entry.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="thesis-search-page">

      {}
      <div className="search-hero">
        <p className="search-subtitle">
          {loading
            ? "Loading archive…"
            : <><strong style={{ color: "var(--role-color, var(--accent))" }}>{allData.length}</strong> approved thesis{allData.length !== 1 ? "es" : ""} in the archive</>
          }
        </p>

        <div className="search-bar-wrap">
          <span className="search-icon-left">🔎</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search by title or author…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={() => setQuery("")}>✕</button>
          )}
        </div>

        <div className="field-pills">
          {FIELD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`field-pill ${field === opt.value ? "active" : ""}`}
              onClick={() => setField(opt.value)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        <div className="field-pills" style={{ marginTop: 8 }}>
          {[{ value: "newest", label: "Newest first", icon: "🕒" },
            { value: "oldest", label: "Oldest first", icon: "📅" }].map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`field-pill ${sort === opt.value ? "active" : ""}`}
              onClick={() => setSort(opt.value)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {}
      {error && (
        <div className="message error" style={{ marginBottom: 24 }}>
          ⚠️ {error}
          <button className="retry-btn" onClick={fetchAll}>Retry</button>
        </div>
      )}

      {}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading thesis archive…</span>
        </div>
      ) : !error && allData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No theses in the database yet</div>
          <div className="empty-sub">Admins can approve uploaded files to add them here.</div>
        </div>
      ) : !error && results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No matches for "{query}"</div>
          <div className="empty-sub">Try a different keyword or switch the filter to All Fields.</div>
        </div>
      ) : (
        <>
          {query && (
            <div className="result-count">
              {results.length} result{results.length !== 1 ? "s" : ""} for <strong>"{query}"</strong>
              {field !== "all" && <> in <em>{FIELD_OPTIONS.find(o => o.value === field)?.label}</em></>}
            </div>
          )}

          <div className="thesis-grid">
            {results.map((entry, i) => (
              <div key={entry.id} className="thesis-card" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="thesis-card-top">
                  <div className="thesis-icon">📑</div>
                  <div className="thesis-meta-right">
                    <span className="thesis-size">{formatSize(entry.file_size)}</span>
                    <span className="thesis-approved-badge">✅ Approved</span>
                  </div>
                </div>

                <div className="thesis-title">
                  <Highlight text={entry.original_name?.replace(/\.pdf$/i, "") ?? "Untitled"} query={query} />
                </div>

                <div className="thesis-meta-row">
                  <span className="meta-item">
                    <span className="meta-label">Author</span>
                    <span className="meta-value"><Highlight text={entry.uploaded_by ?? "—"} query={query} /></span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Approved by</span>
                    <span className="meta-value">{entry.approved_by ?? "—"}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Date</span>
                    <span className="meta-value">{formatDate(entry.approved_at)}</span>
                  </span>
                </div>

                <div className="thesis-actions">
                  <button className="view-thesis-btn" onClick={() => handleView(entry)}>
                    View PDF →
                  </button>
                  {user?.role === "admin" && (
                    confirmId === entry.id ? (
                      <div className="confirm-row">
                        <span className="confirm-text">Remove from database?</span>
                        <button
                          className="confirm-yes-btn"
                          onClick={() => handleDeleteFromDb(entry)}
                          disabled={deleting === entry.id}
                        >
                          {deleting === entry.id ? "Removing…" : "Yes, remove"}
                        </button>
                        <button className="confirm-no-btn" onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="delete-thesis-btn"
                        onClick={() => setConfirmId(entry.id)}
                        disabled={deleting === entry.id}
                      >
                        🗑 Remove
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .thesis-search-page { max-width: 900px; }

        .search-hero { margin-bottom: 28px; }
        .search-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 14px; }

        .search-bar-wrap {
          position: relative; display: flex; align-items: center; margin-bottom: 12px;
        }
        .search-icon-left {
          position: absolute; left: 16px; font-size: 16px; pointer-events: none;
        }
        .search-input {
          width: 100%; padding: 15px 48px;
          background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
          color: var(--text); font-family: var(--font-body); font-size: 15px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
        }
        .search-input:focus {
          border-color: var(--role-color, var(--accent));
          box-shadow: 0 0 0 3px rgba(232,255,71,0.1);
        }
        .search-input::placeholder { color: var(--muted); }
        .search-input:disabled { opacity: 0.6; cursor: not-allowed; }

        .clear-btn {
          position: absolute; right: 14px; background: none; border: none;
          color: var(--muted); cursor: pointer; font-size: 14px;
          padding: 4px 6px; border-radius: 6px; transition: color 0.15s;
        }
        .clear-btn:hover { color: var(--text); }

        .field-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .field-pill {
          padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;
          font-family: var(--font-body); cursor: pointer;
          border: 1px solid var(--border); background: var(--panel); color: var(--muted);
          transition: all 0.15s;
        }
        .field-pill:hover { border-color: var(--role-color, var(--accent)); color: var(--text); }
        .field-pill.active {
          border-color: var(--role-color, var(--accent));
          background: rgba(232,255,71,0.08);
          color: var(--role-color, var(--accent));
        }

        .retry-btn {
          margin-left: 12px; padding: 4px 12px; border-radius: 6px; font-size: 12px;
          font-weight: 600; cursor: pointer; border: 1px solid currentColor;
          background: transparent; color: inherit; font-family: var(--font-body);
        }
        .retry-btn:hover { opacity: 0.75; }

        .loading-state {
          display: flex; align-items: center; gap: 12px;
          color: var(--muted); font-size: 14px; padding: 48px 0;
        }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--role-color, var(--accent));
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state { text-align: center; padding: 64px 24px; color: var(--muted); }
        .empty-icon  { font-size: 48px; margin-bottom: 16px; }
        .empty-title { font-family: var(--font-head); font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .empty-sub   { font-size: 14px; line-height: 1.6; }

        .result-count { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
        .result-count strong { color: var(--text); }
        .result-count em { color: var(--role-color, var(--accent)); font-style: normal; }

        .thesis-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }

        .thesis-card {
          background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
          padding: 20px 22px;
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
          animation: fadeSlideUp 0.3s ease both;
        }
        .thesis-card:hover {
          border-color: var(--role-color, var(--accent));
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.18);
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .thesis-card-top {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        }
        .thesis-icon { font-size: 22px; }
        .thesis-meta-right { display: flex; align-items: center; gap: 10px; }
        .thesis-size { font-size: 12px; color: var(--muted); }
        .thesis-approved-badge {
          font-size: 11px; font-weight: 700; color: #4caf82;
          background: rgba(76,175,130,0.12); border: 1px solid rgba(76,175,130,0.3);
          padding: 2px 9px; border-radius: 20px;
        }

        .thesis-title {
          font-family: var(--font-head); font-size: 17px; font-weight: 700;
          color: var(--text); margin-bottom: 14px; line-height: 1.4; word-break: break-word;
        }

        .thesis-meta-row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 16px; }
        .meta-item { display: flex; flex-direction: column; gap: 2px; }
        .meta-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
        }
        .meta-value { font-size: 13px; color: var(--text); font-weight: 500; }

        .thesis-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .view-thesis-btn {
          padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;
          font-family: var(--font-body); cursor: pointer;
          border: 1px solid var(--role-color, var(--accent));
          background: rgba(232,255,71,0.07);
          color: var(--role-color, var(--accent));
          transition: all 0.15s;
        }
        .view-thesis-btn:hover { background: rgba(232,255,71,0.15); }

        .delete-thesis-btn {
          padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 700;
          font-family: var(--font-body); cursor: pointer;
          border: 1px solid rgba(255,99,99,0.4);
          background: rgba(255,99,99,0.07);
          color: #ff6b6b;
          transition: all 0.15s;
        }
        .delete-thesis-btn:hover { background: rgba(255,99,99,0.18); border-color: #ff6b6b; }
        .delete-thesis-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .confirm-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 6px 10px; border-radius: 8px;
          background: rgba(255,99,99,0.08); border: 1px solid rgba(255,99,99,0.25);
        }
        .confirm-text { font-size: 12px; font-weight: 600; color: #ff6b6b; }
        .confirm-yes-btn {
          padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;
          font-family: var(--font-body); cursor: pointer;
          background: #ff6b6b; color: #fff; border: none;
          transition: opacity 0.15s;
        }
        .confirm-yes-btn:hover { opacity: 0.85; }
        .confirm-yes-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .confirm-no-btn {
          padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;
          font-family: var(--font-body); cursor: pointer;
          background: transparent; color: var(--muted); border: 1px solid var(--border);
          transition: color 0.15s;
        }
        .confirm-no-btn:hover { color: var(--text); }
      `}</style>
    </div>
  );
}
