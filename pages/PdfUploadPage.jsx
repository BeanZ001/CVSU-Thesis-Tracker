import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const API_UPLOAD_URL = "http://localhost/myapp/upload_api.php";

const STATUS_CONFIG = {
  unchecked: {
    label: "Unchecked",
    icon: "🕐",
    color: "#8b8fa8",
    bg: "rgba(139,143,168,0.12)",
    border: "rgba(139,143,168,0.3)",
  },
  reviewing: {
    label: "Reviewing",
    icon: "🔍",
    color: "#ffb347",
    bg: "rgba(255,179,71,0.12)",
    border: "rgba(255,179,71,0.35)",
  },
  passed: {
    label: "Passed",
    icon: "✅",
    color: "#4caf82",
    bg: "rgba(76,175,130,0.12)",
    border: "rgba(76,175,130,0.35)",
  },
  need_revisions: {
    label: "Need Revisions",
    icon: "✏️",
    color: "#ff6b6b",
    bg: "rgba(255,107,107,0.12)",
    border: "rgba(255,107,107,0.35)",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unchecked;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function PdfUploadPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const isAdmin    = user?.role === "admin";
  const isStudent  = user?.role === "student";

  const [file,        setFile]        = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [message,     setMessage]     = useState({ text: "", type: "" });
  const [uploads,     setUploads]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [studentNote,  setStudentNote]  = useState("");

  const [dbFile,        setDbFile]        = useState(null);
  const [dbDragging,    setDbDragging]    = useState(false);
  const [dbUploading,   setDbUploading]   = useState(false);
  const [dbMessage,     setDbMessage]     = useState({ text: "", type: "" });
  const dbInputRef = useRef();
  const [editors,    setEditors]    = useState([]);
  const [sentTo,      setSentTo]      = useState("");
  const [updatingId,  setUpdatingId]  = useState(null);
  const [newUploads,  setNewUploads]  = useState(0);  
  const prevCountRef  = useRef(null);                  
  const pollingRef    = useRef(null);                 
  const inputRef = useRef();

  const navigateToViewer = (f) => {
    if (isAdmin) {
      const params = new URLSearchParams({
        name    : f.original_name,
        uploader: f.uploaded_by,
        status  : f.status ?? "unchecked",
        stored  : f.stored_name,
      });
      navigate(`/review/${f.id}?${params.toString()}`);
    } else {
      const params = new URLSearchParams({
        name  : f.original_name,
        stored: f.stored_name,
        status: f.status ?? "unchecked",
        sentTo: f.sent_to ?? "—",
      });
      navigate(`/file/${f.id}?${params.toString()}`);
    }
  };

  useEffect(() => {
    fetchUploads();
    if (isStudent) fetchEditors();

    
    if (isAdmin) {
      pollingRef.current = setInterval(async () => {
        try {
          const res  = await fetch(
            `${API_UPLOAD_URL}?action=list&username=${encodeURIComponent(user?.username)}&role=${encodeURIComponent(user?.role)}`
          );
          const data = await res.json();
          if (data.success) {
            const incoming = data.files ?? [];
            
            if (prevCountRef.current !== null && incoming.length > prevCountRef.current) {
              setNewUploads(prev => prev + (incoming.length - prevCountRef.current));
            }
            prevCountRef.current = incoming.length;
            setUploads(incoming);
          }
        } catch { }
      }, 10000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchEditors = async () => {
    try {
      
      const res  = await fetch(`${API_UPLOAD_URL}?action=list_admins`);
      const data = await res.json();
      if (data.success && data.admins?.length > 0) {
        setEditors(data.admins);
        setSentTo(data.admins[0]);
      }
    } catch {  }
  };

  const fetchUploads = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch(
        `${API_UPLOAD_URL}?action=list&username=${encodeURIComponent(user?.username)}&role=${encodeURIComponent(user?.role)}`
      );
      const data = await res.json();
      if (data.success) {
        setUploads(data.files);
        prevCountRef.current = data.files.length; 
        setNewUploads(0);                        
      }
    } catch {  }
    finally { setLoadingList(false); }
  };

  const selectFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setMessage({ text: "Only PDF files are accepted.", type: "error" }); return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setMessage({ text: "File must be under 10 MB.", type: "error" }); return;
    }
    
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setMessage({ text: "", type: "" });
  };

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); };

  const handleUpload = async (e) => {
    e?.preventDefault?.();
    if (!file)   { setMessage({ text: "Please select a PDF file first.", type: "error" }); return; }
    if (!sentTo) { setMessage({ text: "Please select an editor to send to.", type: "error" }); return; }

    setUploading(true);
    setMessage({ text: "", type: "" });
    setPreviewOpen(false);

    const formData = new FormData();
    formData.append("action",   "upload");
    formData.append("pdf",      file);
    formData.append("username", user?.username ?? "");
    formData.append("sent_to",  sentTo);
    if (studentNote.trim()) formData.append("student_note", studentNote.trim());

    try {
      const res  = await fetch(API_UPLOAD_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `✅ "${file.name}" sent to ${sentTo} successfully.`, type: "success" });
        setFile(null);
        setStudentNote("");
        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
        if (inputRef.current) inputRef.current.value = "";
        fetchUploads();
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: "Cannot reach the server. Is XAMPP running?", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res  = await fetch(API_UPLOAD_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action   : "update_status",
          id,
          status   : newStatus,
          username : user?.username,
          role     : user?.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUploads();
      } else {
        alert(data.message ?? "Could not update status.");
      }
    } catch { alert("Could not reach the server."); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this file permanently?")) return;
    try {
      const res  = await fetch(API_UPLOAD_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ action: "delete", id, username: user?.username, role: user?.role }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUploads();
      } else {
        alert(data.message);
      }
    } catch { alert("Could not delete file."); }
  };

  const selectDbFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setDbMessage({ text: "Only PDF files are accepted.", type: "error" }); return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setDbMessage({ text: "File must be under 10 MB.", type: "error" }); return;
    }
    setDbFile(f);
    setDbMessage({ text: "", type: "" });
  };

  const handleDirectDbUpload = async (e) => {
    e.preventDefault();
    if (!dbFile) { setDbMessage({ text: "Please select a PDF file first.", type: "error" }); return; }

    setDbUploading(true);
    setDbMessage({ text: "", type: "" });

    const formData = new FormData();
    formData.append("action",   "direct_upload_db");
    formData.append("pdf",      dbFile);
    formData.append("username", user?.username ?? "");
    formData.append("role",     user?.role ?? "");

    try {
      const res  = await fetch(API_UPLOAD_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setDbMessage({ text: `✅ ${data.message}`, type: "success" });
        setDbFile(null);
        if (dbInputRef.current) dbInputRef.current.value = "";
      } else {
        setDbMessage({ text: data.message, type: "error" });
      }
    } catch {
      setDbMessage({ text: "Cannot reach the server. Is XAMPP running?", type: "error" });
    } finally {
      setDbUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024)        return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="pdf-upload-page">

      {isStudent && (
        <form className="upload-form" onSubmit={(e) => { e.preventDefault(); if (file && sentTo) setPreviewOpen(true); }}>

     
          <div
            className={`drop-zone ${dragging ? "drag-over" : ""} ${file ? "has-file" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={e => selectFile(e.target.files[0])}
            />
            {file ? (
              <>
                <div className="drop-icon">📄</div>
                <div className="drop-filename">{file.name}</div>
                <div className="drop-meta">{formatSize(file.size)} · Click to change</div>
              </>
            ) : (
              <>
                <div className="drop-icon">☁️</div>
                <div className="drop-title">Drop a PDF here</div>
                <div className="drop-meta">or click to browse · max 10 MB</div>
              </>
            )}
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:500, color:"var(--muted)", marginBottom:6, letterSpacing:"0.3px", textTransform:"uppercase" }}>
              Send to Editor
            </label>
            {editors.length === 0 ? (
              <p style={{ color:"var(--muted)", fontSize:14 }}>
                No editor accounts found. Ask your administrator to create one.
              </p>
            ) : (
              <select
                value={sentTo}
                onChange={e => setSentTo(e.target.value)}
                className="editor-select"
              >
                {editors.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          <button className="btn" type="submit" disabled={uploading || !file || !sentTo}>
            {uploading ? "Uploading…" : `Review & Send to ${sentTo || "editor"} →`}
          </button>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
        </form>
      )}

  
      {previewOpen && file && (
        <div className="preview-overlay" onClick={e => { if (e.target === e.currentTarget) setPreviewOpen(false); }}>
          <div className="preview-modal">
            {}
            <div className="preview-header">
              <div className="preview-header-left">
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <div className="preview-title">{file.name}</div>
                  <div className="preview-subtitle">{formatSize(file.size)} · Review before sending to <strong>{sentTo}</strong></div>
                </div>
              </div>
              <button className="preview-close-btn" onClick={() => setPreviewOpen(false)} title="Close">✕</button>
            </div>

       
            <div className="preview-pdf-wrap">
              <iframe
                src={previewUrl + "#toolbar=0&navpanes=0"}
                title="PDF Preview"
                className="preview-iframe"
              />
            </div>

           
            <div className="preview-note-section">
              <label className="preview-note-label">
                📝 Add a note to the editor <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              </label>
              <textarea
                className="preview-note-input"
                placeholder="e.g. This is the revised Chapter 3. I updated the methodology section and fixed the citations."
                value={studentNote}
                onChange={e => setStudentNote(e.target.value)}
                rows={3}
              />
            </div>

       
            <div className="preview-footer">
              <button className="preview-cancel-btn" onClick={() => setPreviewOpen(false)}>
                ← Go back and change file
              </button>
              <button
                className="preview-send-btn"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Sending…" : `✉️ Send to ${sentTo}`}
              </button>
            </div>
          </div>
        </div>
      )}

 
      {isAdmin && (
        <div className="upload-form" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            🗄️ Upload Directly to Database
          </h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            Upload a PDF that will be saved directly to the main thesis database, skipping the student submission workflow.
          </p>

         
          <div
            className={`drop-zone ${dbDragging ? "drag-over" : ""} ${dbFile ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDbDragging(true); }}
            onDragLeave={() => setDbDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDbDragging(false); selectDbFile(e.dataTransfer.files[0]); }}
            onClick={() => dbInputRef.current?.click()}
          >
            <input
              ref={dbInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={e => selectDbFile(e.target.files[0])}
            />
            {dbFile ? (
              <>
                <div className="drop-icon">📄</div>
                <div className="drop-filename">{dbFile.name}</div>
                <div className="drop-meta">{formatSize(dbFile.size)} · Click to change</div>
              </>
            ) : (
              <>
                <div className="drop-icon">🗄️</div>
                <div className="drop-title">Drop a PDF to add to the database</div>
                <div className="drop-meta">or click to browse · max 10 MB</div>
              </>
            )}
          </div>

          {dbMessage.text && (
            <div className={`upload-message ${dbMessage.type}`} style={{ marginTop: 10 }}>
              {dbMessage.text}
            </div>
          )}

          <button
            className="upload-btn"
            style={{ marginTop: 14, width: "100%" }}
            disabled={!dbFile || dbUploading}
            onClick={handleDirectDbUpload}
          >
            {dbUploading ? "Uploading…" : "📤 Upload to Database"}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="editor-banner">
          📥 Showing files sent to <strong>{user?.username}</strong>. Use the status buttons to review each file.
        </div>
      )}

      {isAdmin && newUploads > 0 && (
        <div
          className="new-upload-banner"
          onClick={() => { fetchUploads(); }}
          title="Click to refresh and view new files"
        >
          🔔 {newUploads} new file{newUploads > 1 ? "s" : ""} submitted — <u>click to refresh</u>
        </div>
      )}

      <div className="status-legend">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="legend-item" style={{ color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </span>
        ))}
      </div>

      <div className="uploads-section">
        <h2 className="uploads-heading">
          {isAdmin ? "Files Sent to You" : "Your Submitted Files"}
        </h2>

        {loadingList ? (
          <p className="uploads-empty">Loading…</p>
        ) : uploads.length === 0 ? (
          <p className="uploads-empty">
            {isAdmin ? "No files have been sent to you yet." : "You haven't uploaded any files yet."}
          </p>
        ) : (
          <div className="uploads-table-wrap">
            <table className="uploads-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>{isAdmin ? "Submitted By" : "Sent To"}</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(f => {
                  const fileStatus = f.status ?? "unchecked";
                  const isUpdating = updatingId === f.id;
                  return (
                    <tr key={f.id}>
                      <td>
                        <span
                          className="file-link"
                          onClick={() => navigateToViewer(f)}
                        >
                          📄 {f.original_name}
                        </span>
                      </td>
                      <td>{formatSize(f.file_size)}</td>
                      <td>{isAdmin ? f.uploaded_by : f.sent_to}</td>
                      <td>{new Date(f.created_at).toLocaleDateString()}</td>

                   
                      <td>
                        <StatusBadge status={fileStatus} />
                      </td>

                     
                      <td>
                        <div className="actions-wrap">
                          
                          <button
                            className="view-btn"
                            onClick={() => navigateToViewer(f)}
                          >
                            View
                          </button>

                         
                          {isAdmin && (
                            <>
                             
                              {fileStatus === "unchecked" && (
                                <button
                                  className="status-btn reviewing-btn"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusUpdate(f.id, "reviewing")}
                                  title="Mark as currently reviewing"
                                >
                                  🔍 Reviewing
                                </button>
                              )}

                             
                              {(fileStatus === "reviewing" || fileStatus === "passed" || fileStatus === "need_revisions") && (
                                <>
                                  <button
                                    className={`status-btn passed-btn ${fileStatus === "passed" ? "active-status" : ""}`}
                                    disabled={isUpdating || fileStatus === "passed"}
                                    onClick={() => handleStatusUpdate(f.id, "passed")}
                                    title="Mark as passed"
                                  >
                                    ✓ Checked
                                  </button>
                                  <button
                                    className={`status-btn revision-btn ${fileStatus === "need_revisions" ? "active-status" : ""}`}
                                    disabled={isUpdating || fileStatus === "need_revisions"}
                                    onClick={() => handleStatusUpdate(f.id, "need_revisions")}
                                    title="Mark as needs revisions"
                                  >
                                    ✏️ Need Revision
                                  </button>
                                </>
                              )}

                              <button className="delete-btn" onClick={() => handleDelete(f.id)}>
                                Delete
                              </button>
                            </>
                          )}

                        
                          {isStudent && (
                            <button className="delete-btn" onClick={() => handleDelete(f.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .pdf-upload-page { max-width: 900px; }

        .editor-banner {
          background: rgba(255,107,107,0.08);
          border: 1px solid rgba(255,107,107,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: var(--text);
          margin-bottom: 24px;
        }

        .new-upload-banner {
          background: rgba(76,175,130,0.1);
          border: 1px solid rgba(76,175,130,0.4);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #4caf82;
          margin-bottom: 16px;
          cursor: pointer;
          transition: background 0.18s;
          animation: pulse-border 1.5s ease-in-out infinite;
        }
        .new-upload-banner:hover { background: rgba(76,175,130,0.18); }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(76,175,130,0.4); }
          50%       { border-color: rgba(76,175,130,0.9); }
        }

        /* Status legend */
        .status-legend {
          display: flex; flex-wrap: wrap; gap: 16px;
          margin-bottom: 24px;
          padding: 10px 16px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 12px; font-weight: 600;
        }
        .legend-item { display: flex; align-items: center; gap: 4px; }

        .upload-form { margin-bottom: 48px; }

        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          margin-bottom: 16px;
          background: var(--panel);
        }
        .drop-zone:hover, .drop-zone.drag-over {
          border-color: var(--role-color, var(--accent));
          background: rgba(232,255,71,0.03);
        }
        .drop-zone.has-file { border-color: var(--role-color, var(--accent)); border-style: solid; }
        .drop-icon     { font-size: 36px; margin-bottom: 12px; }
        .drop-title    { font-family: var(--font-head); font-size: 18px; font-weight: 700; margin-bottom: 6px; }
        .drop-filename { font-family: var(--font-head); font-size: 16px; font-weight: 700; color: var(--role-color, var(--accent)); margin-bottom: 6px; word-break: break-all; }
        .drop-meta     { font-size: 13px; color: var(--muted); }

        .editor-select {
          width: 100%; padding: 13px 16px;
          background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
          color: var(--text); font-family: var(--font-body); font-size: 15px;
          outline: none; cursor: pointer;
          transition: border-color 0.2s;
        }
        .editor-select:focus { border-color: var(--role-color, var(--accent)); }

        .uploads-heading { font-family: var(--font-head); font-size: 22px; font-weight: 800; margin-bottom: 20px; letter-spacing: -0.3px; }
        .uploads-empty   { color: var(--muted); font-size: 14px; }

        .uploads-table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--border); margin-bottom: 24px; }
        .uploads-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .uploads-table th {
          text-align: left; padding: 12px 16px;
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
          background: var(--panel); border-bottom: 1px solid var(--border);
        }
        .uploads-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text); vertical-align: middle;
        }
        .uploads-table tr:last-child td { border-bottom: none; }
        .uploads-table tr:hover td     { background: rgba(255,255,255,0.02); }

        .file-link { color: var(--role-color, var(--accent)); font-weight: 500; cursor: pointer; }
        .file-link:hover { text-decoration: underline; }

        /* ── Actions cell layout ── */
        .actions-wrap {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
        }

        /* Shared base for all small buttons */
        .view-btn, .delete-btn, .status-btn {
          padding: 5px 11px; border-radius: 7px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: var(--font-body);
          transition: all 0.18s; white-space: nowrap;
          border: 1px solid;
        }

        .view-btn {
          border-color: var(--border);
          background: rgba(255,255,255,0.05);
          color: var(--text);
        }
        .view-btn:hover { border-color: var(--role-color, var(--accent)); color: var(--role-color, var(--accent)); }

        .delete-btn {
          border-color: rgba(255,107,107,0.3);
          background: rgba(255,107,107,0.08);
          color: var(--error);
        }
        .delete-btn:hover { background: rgba(255,107,107,0.18); border-color: var(--error); }

        /* Status action buttons */
        .reviewing-btn {
          border-color: rgba(255,179,71,0.4);
          background: rgba(255,179,71,0.1);
          color: #ffb347;
        }
        .reviewing-btn:hover:not(:disabled) { background: rgba(255,179,71,0.22); }

        .passed-btn {
          border-color: rgba(76,175,130,0.4);
          background: rgba(76,175,130,0.1);
          color: #4caf82;
        }
        .passed-btn:hover:not(:disabled) { background: rgba(76,175,130,0.22); }
        .passed-btn.active-status {
          background: rgba(76,175,130,0.22);
          border-color: #4caf82;
          opacity: 0.65; cursor: default;
        }

        .revision-btn {
          border-color: rgba(255,107,107,0.35);
          background: rgba(255,107,107,0.09);
          color: #ff6b6b;
        }
        .revision-btn:hover:not(:disabled) { background: rgba(255,107,107,0.2); }
        .revision-btn.active-status {
          background: rgba(255,107,107,0.2);
          border-color: #ff6b6b;
          opacity: 0.65; cursor: default;
        }

        .status-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Pre-send preview modal ── */
        .preview-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .preview-modal {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 18px;
          width: 100%; max-width: 860px;
          max-height: 92vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.18s ease;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .preview-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--bg);
          gap: 12px;
        }
        .preview-header-left {
          display: flex; align-items: center; gap: 12px; min-width: 0;
        }
        .preview-title {
          font-family: var(--font-head); font-size: 15px; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          color: var(--text);
        }
        .preview-subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .preview-close-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-size: 14px; font-weight: 700;
          padding: 5px 10px; border-radius: 8px; cursor: pointer;
          transition: all 0.15s; flex-shrink: 0;
        }
        .preview-close-btn:hover { color: var(--text); border-color: var(--text); }

        .preview-pdf-wrap {
          flex: 1; overflow: hidden; background: #111; min-height: 0;
        }
        .preview-iframe {
          width: 100%; height: 100%;
          border: none; display: block;
          min-height: 400px;
        }

        .preview-note-section {
          padding: 14px 20px 10px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--bg);
        }
        .preview-note-label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--muted); margin-bottom: 8px;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .preview-note-input {
          width: 100%; padding: 10px 14px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text);
          font-family: var(--font-body); font-size: 13px;
          resize: vertical; min-height: 68px; outline: none;
          transition: border-color 0.18s; line-height: 1.55;
        }
        .preview-note-input:focus { border-color: var(--role-color, var(--accent)); }
        .preview-note-input::placeholder { color: var(--muted); opacity: 0.6; }

        .preview-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid var(--border);
          flex-shrink: 0; gap: 12px; flex-wrap: wrap;
          background: var(--panel);
        }
        .preview-cancel-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 13px; font-weight: 600; padding: 9px 16px;
          border-radius: 9px; cursor: pointer; transition: all 0.18s;
        }
        .preview-cancel-btn:hover { color: var(--text); border-color: var(--text); }
        .preview-send-btn {
          background: var(--role-color, var(--accent));
          border: none; color: #000;
          font-family: var(--font-head); font-size: 14px; font-weight: 800;
          padding: 10px 24px; border-radius: 9px; cursor: pointer;
          transition: opacity 0.18s; letter-spacing: 0.2px;
        }
        .preview-send-btn:hover:not(:disabled) { opacity: 0.88; }
        .preview-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 600px) {
          .preview-modal { border-radius: 14px; }
          .preview-footer { flex-direction: column-reverse; }
          .preview-cancel-btn, .preview-send-btn { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
