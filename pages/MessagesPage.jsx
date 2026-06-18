import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

const API = "http://localhost/myapp/messages_api.php";

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fileIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  const map = {
    pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
    ppt: "📋", pptx: "📋", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
    gif: "🖼️", zip: "📦", rar: "📦", mp4: "🎬", mp3: "🎵",
    txt: "📃", csv: "📊",
  };
  return map[ext] || "📎";
}

function ThreadList({ threads, selected, onSelect, onNew, currentUser }) {
  return (
    <div style={{
      width: 280, minWidth: 220, borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{
        padding: "16px 14px 12px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 15 }}>
          Messages
        </span>
        <button onClick={onNew} style={{
          background: "var(--role-color, var(--accent))",
          color: "#000", border: "none", borderRadius: 8,
          padding: "5px 12px", fontSize: 12, fontWeight: 700,
          cursor: "pointer",
        }}>
          + New
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {threads.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13, padding: 16 }}>
            No conversations yet. Click "+ New" to start one!
          </p>
        ) : threads.map(t => (
          <div
            key={t.id}
            onClick={() => onSelect(t)}
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              background: selected?.id === t.id
                ? "rgba(255,255,255,0.06)"
                : "transparent",
              transition: "background 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{
                fontWeight: t.has_unread ? 700 : 500,
                fontSize: 13,
                color: t.has_unread ? "var(--text)" : "var(--muted)",
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {t.has_unread && <span style={{ color: "var(--role-color, var(--accent))", marginRight: 5 }}>●</span>}
                {t.other_party ?? (t.created_by === currentUser ? t.sent_to : t.created_by)}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8, whiteSpace: "nowrap" }}>
                {fmtDate(t.last_message_at || t.updated_at)}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: t.has_unread ? 600 : 400, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.subject}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, opacity: 0.75 }}>
              {t.last_file_name
                ? `${fileIcon(t.last_file_name)} ${t.last_file_name}`
                : (t.last_message_body || "…")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg, currentUser }) {
  const isMine = msg.sender === currentUser;
  return (
    <div style={{
      display: "flex",
      justifyContent: isMine ? "flex-end" : "flex-start",
      marginBottom: 14,
    }}>
      <div style={{
        maxWidth: "72%",
        background: isMine
          ? "rgba(var(--role-color-rgb, 232,255,71), 0.13)"
          : "var(--panel)",
        border: `1px solid ${isMine ? "rgba(var(--role-color-rgb, 232,255,71),0.25)" : "var(--border)"}`,
        borderRadius: isMine ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
        padding: "10px 14px",
      }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5, fontWeight: 600 }}>
          {msg.sender} · {msg.sender_role === "admin" ? "🛡️ Admin" : "📚 Student"} · {fmtDate(msg.created_at)}
        </div>
        {msg.body && (
          <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {msg.body}
          </p>
        )}
        {msg.has_file && (() => {
          const viewUrl = `${API}?action=view&message_id=${msg.id}&username=${encodeURIComponent(currentUser)}`;
          const ext = (msg.file_name ?? "").split(".").pop().toLowerCase();
          const isImage = ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext);
          const isPdf   = ext === "pdf";

          if (isImage) {
            return (
              <div style={{ marginTop: 4 }}>
                <img
                  src={viewUrl}
                  alt={msg.file_name}
                  style={{
                    maxWidth: "100%", maxHeight: 320,
                    borderRadius: 8, display: "block",
                    border: "1px solid var(--border)",
                    pointerEvents: "none", 
                  }}
                  onContextMenu={e => e.preventDefault()}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  🖼️ {msg.file_name}{msg.file_size ? ` · ${fmtSize(msg.file_size)}` : ""}
                </div>
              </div>
            );
          }

          if (isPdf) {
            return (
              <div style={{ marginTop: 4 }}>
                <iframe
                  src={viewUrl}
                  title={msg.file_name}
                  style={{
                    width: "100%", height: 420,
                    border: "1px solid var(--border)",
                    borderRadius: 8, background: "#fff",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  📄 {msg.file_name}{msg.file_size ? ` · ${fmtSize(msg.file_size)}` : ""}
                </div>
              </div>
            );
          }

          
          return (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontSize: 12.5, fontWeight: 600,
            }}>
              {fileIcon(msg.file_name)} {msg.file_name}
              {msg.file_size ? <span style={{ fontWeight: 400 }}>({fmtSize(msg.file_size)})</span> : null}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function ComposeForm({ admins, students, isAdmin, onSent, onCancel }) {
  const { user } = useAuth();

  
  const recipientOptions = isAdmin
    ? [
        ...admins.map(a => ({ value: a.username, label: `${a.username} (Admin)`, group: "Admins" })),
        ...students.map(s => ({ value: s.username, label: `${s.username} (Student)`, group: "Students" })),
      ]
    : admins.map(a => ({ value: a.username ?? a, label: a.username ?? a, group: "Admins" }));

  const [sentTo,    setSentTo]    = useState(recipientOptions[0]?.value ?? "");
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [file,      setFile]      = useState(null);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const fileRef = useRef();

  const send = async () => {
    if (!sentTo) { setError("Please select a recipient."); return; }
    if (!body.trim() && !file) { setError("Please write a message or attach a file."); return; }
    setSending(true); setError("");

    const fd = new FormData();
    fd.append("action",      "send");
    fd.append("sender",      user.username);
    fd.append("sender_role", user.role);
    fd.append("sent_to",     sentTo);
    fd.append("subject",     subject || "(No subject)");
    fd.append("body",        body);
    if (file) fd.append("file", file);

    try {
      const res  = await fetch(API, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        onSent(data.thread_id);
      } else {
        setError(data.message || "Could not send.");
      }
    } catch {
      setError("Cannot reach the server. Is XAMPP running?");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 560 }}>
      <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
        New Message
      </h2>

      <label style={lbl}>Send to</label>
      <select value={sentTo} onChange={e => setSentTo(e.target.value)} style={input}>
        {isAdmin ? (
          <>
            <optgroup label="── Admins ──">
              {admins.map(a => <option key={a.username} value={a.username}>{a.username}</option>)}
            </optgroup>
            <optgroup label="── Students ──">
              {students.map(s => <option key={s.username} value={s.username}>{s.username}</option>)}
            </optgroup>
          </>
        ) : (
          admins.map(a => {
            const name = a.username ?? a;
            return <option key={name} value={name}>{name}</option>;
          })
        )}
      </select>

      <label style={lbl}>Subject</label>
      <input
        type="text" value={subject} placeholder="(optional)"
        onChange={e => setSubject(e.target.value)} style={input}
      />

      <label style={lbl}>Message</label>
      <textarea
        value={body} onChange={e => setBody(e.target.value)}
        placeholder="Write your message here…"
        rows={5}
        style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
      />

      <label style={lbl}>Attach a file (optional · max 20 MB)</label>
      <div style={{
        border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
        cursor: "pointer", background: "var(--panel)",
      }} onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" style={{ display: "none" }}
          onChange={e => setFile(e.target.files[0] || null)} />
        {file ? (
          <>
            <span style={{ fontSize: 20 }}>{fileIcon(file.name)}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmtSize(file.size)}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value=""; }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>
              ✕
            </button>
          </>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>📎 Click to attach a file</span>
        )}
      </div>

      {error && <div style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={send} disabled={sending} style={{
          padding: "10px 24px", borderRadius: 10, border: "none",
          background: "var(--role-color, var(--accent))", color: "#000",
          fontWeight: 700, fontSize: 14, cursor: sending ? "not-allowed" : "pointer",
          opacity: sending ? 0.65 : 1,
        }}>
          {sending ? "Sending…" : "Send →"}
        </button>
        <button onClick={onCancel} style={{
          padding: "10px 18px", borderRadius: 10,
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ThreadView({ thread, currentUser, userRole, onBack, onRefresh }) {
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const bottomRef = useRef();
  const fileRef   = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}?action=get_thread&thread_id=${thread.id}&username=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); markRead(); }, [thread.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const markRead = () => {
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", thread_id: thread.id, username: currentUser }),
    }).catch(() => {});
  };

  const sendReply = async () => {
    if (!replyBody.trim() && !replyFile) { setError("Please write a message or attach a file."); return; }
    setSending(true); setError("");

    const fd = new FormData();
    fd.append("action",      "reply");
    fd.append("thread_id",   thread.id);
    fd.append("sender",      currentUser);
    fd.append("sender_role", userRole);
    fd.append("body",        replyBody);
    if (replyFile) fd.append("file", replyFile);

    try {
      const res  = await fetch(API, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setReplyBody(""); setReplyFile(null);
        if (fileRef.current) fileRef.current.value = "";
        await load();
        onRefresh();
      } else {
        setError(data.message || "Could not send reply.");
      }
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setSending(false);
    }
  };

  const deleteThread = async () => {
    if (!confirm("Delete this entire conversation?")) return;
    try {
      const res  = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_thread", thread_id: thread.id, username: currentUser, role: userRole }),
      });
      const data = await res.json();
      if (data.success) { onRefresh(); onBack(); }
      else alert(data.message);
    } catch { alert("Could not delete."); }
  };

  const otherParty = thread.other_party ?? (thread.created_by === currentUser ? thread.sent_to : thread.created_by);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1, minWidth: 0 }}>
      {}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid var(--border)", borderRadius: 8,
          color: "var(--muted)", cursor: "pointer", padding: "4px 10px", fontSize: 13,
        }}>← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {thread.subject}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {thread.created_by === currentUser ? `To: ${thread.sent_to}` : `From: ${thread.created_by}`}
          </div>
        </div>
        <button onClick={deleteThread} style={{
          background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
          borderRadius: 8, color: "#ff6b6b", cursor: "pointer", padding: "5px 11px", fontSize: 12, fontWeight: 600,
        }}>Delete</button>
      </div>

      {}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</p>
        ) : messages.map(m => (
          <MessageBubble key={m.id} msg={m} currentUser={currentUser} />
        ))}
        <div ref={bottomRef} />
      </div>

      {}
      <div style={{
        borderTop: "1px solid var(--border)", padding: "14px 20px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder="Write a reply…"
          rows={3}
          style={{
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 14px", color: "var(--text)",
            fontFamily: "var(--font-body)", fontSize: 13.5, resize: "vertical",
            outline: "none", lineHeight: 1.5,
          }}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
        />

        {}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input ref={fileRef} type="file" style={{ display: "none" }}
            onChange={e => setReplyFile(e.target.files[0] || null)} />
          <button onClick={() => fileRef.current?.click()} style={{
            padding: "6px 13px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--panel)",
            color: "var(--muted)", fontSize: 12.5, cursor: "pointer",
          }}>
            📎 {replyFile ? replyFile.name : "Attach file"}
          </button>
          {replyFile && (
            <button onClick={() => { setReplyFile(null); fileRef.current.value = ""; }} style={{
              background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 15,
            }}>✕</button>
          )}
          <button onClick={sendReply} disabled={sending} style={{
            marginLeft: "auto",
            padding: "7px 20px", borderRadius: 8, border: "none",
            background: "var(--role-color, var(--accent))", color: "#000",
            fontWeight: 700, fontSize: 13, cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.65 : 1,
          }}>
            {sending ? "Sending…" : "Send ↑"}
          </button>
        </div>

        {error && <div style={{ color: "var(--error)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Ctrl+Enter to send</div>
      </div>
    </div>
  );
}

const input = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--bg)",
  color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 14,
  outline: "none", marginBottom: 14, boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
};

export default function MessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [threads,   setThreads]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  
  const [admins,    setAdmins]    = useState([]);
  
  const [adminList,  setAdminList]  = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [composing, setComposing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}?action=list&username=${encodeURIComponent(user.username)}&role=${encodeURIComponent(user.role)}`);
      const data = await res.json();
      if (data.success) setThreads(data.threads);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      fetchRecipients();
    } else {
      fetchAdmins();
    }
  }, []);

  
  const fetchAdmins = async () => {
    try {
      const res  = await fetch(`${API}?action=list_admins`);
      const data = await res.json();
      if (data.success) setAdmins(data.admins); 
    } catch {}
  };

  
  const fetchRecipients = async () => {
    try {
      const res  = await fetch(`${API}?action=list_recipients&username=${encodeURIComponent(user.username)}&role=admin`);
      const data = await res.json();
      if (data.success) {
        setAdminList(data.admins);    
        setStudentList(data.students); 
      }
    } catch {}
  };

  const openThread = (t) => { setComposing(false); setSelected(t); };
  const handleSent = async (threadId) => {
    setComposing(false);
    await load();
    const res  = await fetch(`${API}?action=list&username=${encodeURIComponent(user.username)}&role=${encodeURIComponent(user.role)}`);
    const data = await res.json();
    if (data.success) {
      setThreads(data.threads);
      const t = data.threads.find(x => x.id === threadId);
      if (t) setSelected(t);
    }
  };

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 120px)",
      border: "1px solid var(--border)", borderRadius: 14,
      overflow: "hidden", background: "var(--bg)",
    }}>
      {}
      {loading ? (
        <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>Loading…</div>
      ) : (
        <ThreadList
          threads={threads}
          selected={selected}
          onSelect={openThread}
          onNew={() => { setSelected(null); setComposing(true); }}
          currentUser={user.username}
        />
      )}

      {}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {composing ? (
          <ComposeForm
            admins={isAdmin ? adminList : admins}
            students={isAdmin ? studentList : []}
            isAdmin={isAdmin}
            onSent={handleSent}
            onCancel={() => setComposing(false)}
          />
        ) : selected ? (
          <ThreadView
            thread={selected}
            currentUser={user.username}
            userRole={user.role}
            onBack={() => setSelected(null)}
            onRefresh={load}
          />
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--muted)", gap: 12,
          }}>
            <span style={{ fontSize: 42 }}>💬</span>
            <p style={{ fontSize: 14, textAlign: "center", maxWidth: 260 }}>
              {isAdmin
                ? "Select a conversation, or click \"+ New\" to message an admin or student."
                : "Send files and messages to your admin. Click \"+ New\" to start."}
            </p>
            <button onClick={() => setComposing(true)} style={{
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: "var(--role-color, var(--accent))", color: "#000",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              + New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
