

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

const API_URL = "http://localhost/myapp/user_api.php";

const ROLES = ["student", "admin"];

const ROLE_META = {
  admin   : { icon: "🛡️", color: "#ff6b6b",  bg: "rgba(255,107,107,0.12)",  border: "rgba(255,107,107,0.3)"  },
  
  student : { icon: "📚", color: "#47c6ff",  bg: "rgba(71,198,255,0.10)",   border: "rgba(71,198,255,0.3)"   },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] ?? ROLE_META.student;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
      whiteSpace: "nowrap",
    }}>
      {m.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function StatusBadge({ suspended }) {
  return suspended ? (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: "#ff6b6b",
      background: "rgba(255,107,107,0.12)",
      border: "1px solid rgba(255,107,107,0.3)",
    }}>
      🚫 Suspended
    </span>
  ) : (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: "#4caf82",
      background: "rgba(76,175,130,0.12)",
      border: "1px solid rgba(76,175,130,0.35)",
    }}>
      ✅ Active
    </span>
  );
}

function CreateUserModal({ onClose, onCreated, currentAdmin }) {
  const [form,    setForm]    = useState({ username: "", email: "", password: "", role: "student" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const firstRef = useRef();

  useEffect(() => { firstRef.current?.focus(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const { username, email, password, role } = form;
    if (!username.trim()) { setError("Username is required."); return; }
    if (!email.trim())    { setError("Email is required."); return; }
    if (!password)        { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSaving(true); setError("");
    try {
      const res  = await fetch(API_URL, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ action: "create_user", username, email, password, role, admin: currentAdmin }),
      });
      const data = await res.json();
      if (data.success) { onCreated(); onClose(); }
      else setError(data.message ?? "Could not create user.");
    } catch { setError("Cannot reach the server. Is XAMPP running?"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">➕ Create New Account</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              ref={firstRef}
              className="field-input"
              value={form.username}
              onChange={e => set("username", e.target.value)}
              placeholder="e.g. johndoe"
              autoComplete="off"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="e.g. john@example.com"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Role</label>
            <div className="role-picker">
              {ROLES.map(r => {
                const m = ROLE_META[r];
                return (
                  <button
                    key={r}
                    className={`role-option ${form.role === r ? "selected" : ""}`}
                    style={form.role === r ? { borderColor: m.color, background: m.bg, color: m.color } : {}}
                    onClick={() => set("role", r)}
                    type="button"
                  >
                    {m.icon} {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="modal-error">⚠ {error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-create" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RolePopover({ user, onClose, onChanged, currentAdmin }) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (newRole) => {
    if (newRole === user.role) { onClose(); return; }
    setSaving(true);
    try {
      const res  = await fetch(API_URL, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ action: "change_role", id: user.id, role: newRole, admin: currentAdmin }),
      });
      const data = await res.json();
      if (data.success) { onChanged(); onClose(); }
      else alert(data.message ?? "Could not change role.");
    } catch { alert("Server unreachable."); }
    finally { setSaving(false); }
  };

  return (
    <div className="popover">
      <div className="popover-label">Set role for <strong>{user.username}</strong></div>
      {ROLES.map(r => {
        const m = ROLE_META[r];
        const active = r === user.role;
        return (
          <button
            key={r}
            className={`popover-role ${active ? "popover-role-active" : ""}`}
            style={active ? { borderColor: m.color, color: m.color, background: m.bg } : {}}
            onClick={() => handleChange(r)}
            disabled={saving || active}
          >
            {m.icon} {r.charAt(0).toUpperCase() + r.slice(1)}
            {active && <span className="popover-current"> · current</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterRole,  setFilterRole]  = useState("all");
  const [showCreate,  setShowCreate]  = useState(false);
  const [rolePopover, setRolePopover] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  
  useEffect(() => {
    if (!rolePopover) return;
    const handler = (e) => {
      if (!e.target.closest(".popover") && !e.target.closest(".role-change-btn")) {
        setRolePopover(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rolePopover]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}?action=list_users&admin=${encodeURIComponent(currentUser?.username)}`);
      const data = await res.json();
      if (data.success) setUsers(data.users ?? []);
    } catch {  }
    finally { setLoading(false); }
  };

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuspend = async (u) => {
    const newStatus = u.suspended ? 0 : 1;
    const verb      = u.suspended ? "Unsuspend" : "Suspend";
    if (!confirm(`${verb} account "${u.username}"?`)) return;
    setActioningId(u.id);
    try {
      const res  = await fetch(API_URL, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ action: "set_suspended", id: u.id, suspended: newStatus, admin: currentUser?.username }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${u.username} ${newStatus ? "suspended" : "reactivated"}.`);
        fetchUsers();
      } else {
        alert(data.message ?? "Could not update account.");
      }
    } catch { alert("Server unreachable."); }
    finally { setActioningId(null); }
  };

  const handleDelete = async (u) => {
    if (u.username === currentUser?.username) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Permanently delete "${u.username}"? This cannot be undone.`)) return;
    setActioningId(u.id);
    try {
      const res  = await fetch(API_URL, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ action: "delete_user", id: u.id, admin: currentUser?.username }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${u.username} deleted.`, "error");
        fetchUsers();
      } else {
        alert(data.message ?? "Could not delete account.");
      }
    } catch { alert("Server unreachable."); }
    finally { setActioningId(null); }
  };

  
  const filtered = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="um-root">

      {}
      <div className="um-toolbar">
        <div className="um-search-wrap">
          <span className="um-search-icon">🔍</span>
          <input
            className="um-search"
            placeholder="Search by username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="um-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="um-filters">
          {["all", ...ROLES].map(r => (
            <button
              key={r}
              className={`filter-btn ${filterRole === r ? "filter-active" : ""}`}
              onClick={() => setFilterRole(r)}
            >
              {r === "all" ? "All Roles" : `${ROLE_META[r].icon} ${r.charAt(0).toUpperCase() + r.slice(1)}`}
            </button>
          ))}
        </div>

        <button className="create-btn" onClick={() => setShowCreate(true)}>
          + New Account
        </button>
      </div>

      {}
      <div className="um-stats">
        <div className="stat-chip">
          <span className="stat-num">{users.length}</span>
          <span className="stat-lbl">Total Accounts</span>
        </div>
        {ROLES.map(r => (
          <div key={r} className="stat-chip" style={{ "--sc": ROLE_META[r].color }}>
            <span className="stat-num" style={{ color: ROLE_META[r].color }}>
              {users.filter(u => u.role === r).length}
            </span>
            <span className="stat-lbl">{ROLE_META[r].icon} {r.charAt(0).toUpperCase() + r.slice(1)}s</span>
          </div>
        ))}
        <div className="stat-chip">
          <span className="stat-num" style={{ color: "#ff6b6b" }}>
            {users.filter(u => u.suspended).length}
          </span>
          <span className="stat-lbl">🚫 Suspended</span>
        </div>
      </div>

      {}
      {loading ? (
        <div className="um-empty">
          <span className="spinner" /> Loading accounts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="um-empty">
          {users.length === 0
            ? "No accounts found. Create the first one above."
            : "No accounts match your search."}
        </div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isSelf    = u.username === currentUser?.username;
                const isActing  = actioningId === u.id;
                return (
                  <tr key={u.id} className={`${u.suspended ? "row-suspended" : ""} ${isSelf ? "row-self" : ""}`}>

                    {}
                    <td>
                      <div className="user-cell">
                        <div
                          className="user-avatar-sm"
                          style={{ background: ROLE_META[u.role]?.bg, color: ROLE_META[u.role]?.color, border: `1px solid ${ROLE_META[u.role]?.border}` }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-cell-name">
                            {u.username}
                            {isSelf && <span className="self-tag">you</span>}
                          </div>
                          <div className="user-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {}
                    <td style={{ position: "relative" }}>
                      <button
                        className="role-change-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRolePopover(prev =>
                            prev?.userId === u.id ? null : { userId: u.id }
                          );
                        }}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role" : "Click to change role"}
                      >
                        <RoleBadge role={u.role} />
                        {!isSelf && <span className="role-edit-hint">▾</span>}
                      </button>

                      {rolePopover?.userId === u.id && (
                        <RolePopover
                          user={u}
                          onClose={() => setRolePopover(null)}
                          onChanged={() => { fetchUsers(); showToast(`${u.username}'s role updated.`); }}
                          currentAdmin={currentUser?.username}
                        />
                      )}
                    </td>

                    {}
                    <td><StatusBadge suspended={!!u.suspended} /></td>

                    {}
                    <td className="date-cell">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>

                    {}
                    <td>
                      <div className="row-actions">
                        {!isSelf && (
                          <button
                            className={`action-btn ${u.suspended ? "unsuspend-btn" : "suspend-btn"}`}
                            onClick={() => handleSuspend(u)}
                            disabled={isActing}
                            title={u.suspended ? "Reactivate account" : "Suspend account"}
                          >
                            {isActing ? "…" : u.suspended ? "↩ Unsuspend" : "🚫 Suspend"}
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(u)}
                            disabled={isActing}
                            title="Permanently delete account"
                          >
                            Delete
                          </button>
                        )}
                        {isSelf && (
                          <span className="self-note">Your account</span>
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

      {}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchUsers(); showToast("Account created successfully."); }}
          currentAdmin={currentUser?.username}
        />
      )}

      {}
      {toast && (
        <div className={`um-toast ${toast.type === "error" ? "toast-err" : "toast-ok"}`}>
          {toast.text}
        </div>
      )}

      <style>{`
        .um-root { max-width: 960px; display: flex; flex-direction: column; gap: 20px; }

        /* ── Toolbar ── */
        .um-toolbar {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }

        .um-search-wrap {
          position: relative; flex: 1; min-width: 200px;
        }
        .um-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          font-size: 14px; pointer-events: none;
        }
        .um-search {
          width: 100%; padding: 9px 36px 9px 36px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 9px; color: var(--text);
          font-family: var(--font-body); font-size: 14px;
          outline: none; transition: border-color 0.18s;
        }
        .um-search:focus { border-color: var(--role-color, var(--accent)); }
        .um-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--muted);
          cursor: pointer; font-size: 12px; padding: 2px 4px;
        }
        .um-search-clear:hover { color: var(--text); }

        .um-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .filter-btn {
          padding: 7px 13px; border-radius: 8px;
          background: var(--panel); border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.18s; white-space: nowrap;
        }
        .filter-btn:hover { color: var(--text); border-color: var(--text); }
        .filter-btn.filter-active {
          background: rgba(255,255,255,0.06);
          border-color: var(--role-color, var(--accent));
          color: var(--role-color, var(--accent));
        }

        .create-btn {
          padding: 9px 18px; border-radius: 9px;
          background: var(--role-color, var(--accent)); color: #111;
          border: none; font-family: var(--font-body);
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.18s; white-space: nowrap;
        }
        .create-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

        /* ── Stats ── */
        .um-stats {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .stat-chip {
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 16px; border-radius: 10px;
          background: var(--panel); border: 1px solid var(--border);
          min-width: 80px;
        }
        .stat-num  { font-family: var(--font-head); font-size: 22px; font-weight: 800; line-height: 1; }
        .stat-lbl  { font-size: 11px; color: var(--muted); font-weight: 600; }

        /* ── Table ── */
        .um-table-wrap {
          border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
        }
        .um-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .um-table th {
          text-align: left; padding: 11px 16px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
          background: var(--panel); border-bottom: 1px solid var(--border);
        }
        .um-table td {
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          color: var(--text); vertical-align: middle;
        }
        .um-table tr:last-child td { border-bottom: none; }
        .um-table tr:hover td      { background: rgba(255,255,255,0.015); }
        .row-suspended td          { opacity: 0.55; }
        .row-self td               { background: rgba(255,255,255,0.02); }

        .date-cell { font-size: 13px; color: var(--muted); white-space: nowrap; }

        /* User cell */
        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar-sm {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; flex-shrink: 0;
        }
        .user-cell-name  { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; }
        .user-cell-email { font-size: 12px; color: var(--muted); }
        .self-tag {
          font-size: 10px; font-weight: 700; padding: 1px 7px;
          background: rgba(232,255,71,0.1); border: 1px solid rgba(232,255,71,0.3);
          border-radius: 20px; color: #e8ff47;
        }

        /* Role change button */
        .role-change-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer;
          padding: 2px; border-radius: 6px; transition: all 0.15s;
        }
        .role-change-btn:disabled { cursor: default; }
        .role-change-btn:not(:disabled):hover { opacity: 0.8; }
        .role-edit-hint { font-size: 10px; color: var(--muted); margin-top: 1px; }

        /* Role popover */
        .popover {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 999;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 12px; padding: 10px;
          display: flex; flex-direction: column; gap: 6px;
          min-width: 180px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: popIn 0.15s ease;
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .popover-label {
          font-size: 11px; color: var(--muted); padding: 2px 4px 6px;
          border-bottom: 1px solid var(--border); margin-bottom: 2px;
        }
        .popover-role {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: 8px;
          background: transparent; border: 1px solid transparent;
          color: var(--text); font-family: var(--font-body);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; text-align: left; width: 100%;
        }
        .popover-role:not(:disabled):hover {
          background: rgba(255,255,255,0.05); border-color: var(--border);
        }
        .popover-role:disabled { opacity: 0.6; cursor: default; }
        .popover-current { font-size: 11px; color: var(--muted); font-weight: 400; }

        /* Actions */
        .row-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .action-btn {
          padding: 5px 11px; border-radius: 7px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: var(--font-body);
          transition: all 0.18s; white-space: nowrap;
          border: 1px solid;
        }
        .suspend-btn {
          border-color: rgba(255,179,71,0.4);
          background: rgba(255,179,71,0.08);
          color: #ffb347;
        }
        .suspend-btn:hover:not(:disabled) { background: rgba(255,179,71,0.18); }
        .unsuspend-btn {
          border-color: rgba(76,175,130,0.4);
          background: rgba(76,175,130,0.08);
          color: #4caf82;
        }
        .unsuspend-btn:hover:not(:disabled) { background: rgba(76,175,130,0.2); }
        .delete-btn {
          border-color: rgba(255,107,107,0.3);
          background: rgba(255,107,107,0.08);
          color: #ff6b6b;
        }
        .delete-btn:hover:not(:disabled) { background: rgba(255,107,107,0.18); }
        .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .self-note { font-size: 12px; color: var(--muted); font-style: italic; }

        /* Empty state */
        .um-empty {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; padding: 48px 24px;
          color: var(--muted); font-size: 14px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 12px;
        }

        /* Spinner */
        .spinner {
          display: inline-block; width: 18px; height: 18px;
          border: 2px solid var(--border);
          border-top-color: var(--role-color, var(--accent));
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 16px; width: 100%; max-width: 460px;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 22px 14px;
          border-bottom: 1px solid var(--border);
        }
        .modal-title { font-family: var(--font-head); font-size: 16px; font-weight: 800; }
        .modal-close {
          background: none; border: none; color: var(--muted);
          font-size: 16px; cursor: pointer; padding: 4px 8px;
          border-radius: 6px; transition: all 0.15s;
        }
        .modal-close:hover { color: var(--text); background: var(--panel); }

        .modal-body {
          padding: 20px 22px;
          display: flex; flex-direction: column; gap: 16px;
        }

        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
        }
        .field-input {
          padding: 10px 14px; border-radius: 9px;
          background: var(--panel); border: 1px solid var(--border);
          color: var(--text); font-family: var(--font-body); font-size: 14px;
          outline: none; transition: border-color 0.18s;
        }
        .field-input:focus { border-color: var(--role-color, var(--accent)); }

        .role-picker { display: flex; gap: 8px; }
        .role-option {
          flex: 1; padding: 8px 6px; border-radius: 9px;
          background: var(--panel); border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.18s; text-align: center;
        }
        .role-option:hover { border-color: var(--text); color: var(--text); }
        .role-option.selected { font-weight: 800; }

        .modal-error {
          padding: 10px 14px; border-radius: 9px;
          background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3);
          color: #ff6b6b; font-size: 13px;
        }

        .modal-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 22px 18px;
          border-top: 1px solid var(--border);
        }
        .btn-cancel {
          padding: 9px 18px; border-radius: 9px;
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); font-family: var(--font-body);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.18s;
        }
        .btn-cancel:hover { color: var(--text); border-color: var(--text); }
        .btn-create {
          padding: 9px 20px; border-radius: 9px;
          background: var(--role-color, var(--accent)); color: #111;
          border: none; font-family: var(--font-body);
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.18s;
        }
        .btn-create:hover:not(:disabled) { filter: brightness(1.1); }
        .btn-create:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Toast ── */
        .um-toast {
          position: fixed; bottom: 28px; left: 50%;
          transform: translateX(-50%);
          padding: 11px 22px; border-radius: 40px;
          font-size: 13px; font-weight: 600;
          font-family: var(--font-body); z-index: 9999;
          white-space: nowrap; pointer-events: none;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          animation: toastIn 0.2s ease;
        }
        .toast-ok  { background: rgba(76,175,130,0.15); border: 1px solid #4caf82; color: #4caf82; }
        .toast-err { background: rgba(255,107,107,0.15); border: 1px solid #ff6b6b; color: #ff6b6b; }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
