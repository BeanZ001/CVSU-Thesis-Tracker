import { useState, useEffect } from "react";

const API_URL = "http://localhost/myapp/upload_api.php";

const STATUS_META = {
  reviewing      : { label: "Reviewing",      color: "#ffb347", bg: "rgba(255,179,71,0.10)",  icon: "🔍" },
  need_revisions : { label: "Need Revisions", color: "#ff6b6b", bg: "rgba(255,107,107,0.10)", icon: "✏️" },
  passed         : { label: "Passed",         color: "#4caf82", bg: "rgba(76,175,130,0.10)",  icon: "✅" },
  unchecked      : { label: "Unchecked",      color: "#6b6b80", bg: "rgba(107,107,128,0.10)", icon: "📭" },
};

function StatCard({ icon, label, value, color, bg, delay = 0 }) {
  return (
    <div className="stat-card" style={{ "--card-color": color, "--card-bg": bg, animationDelay: `${delay}ms` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-bar">
        <div className="stat-bar-fill" />
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mini-bar-wrap" title={`${value} / ${max} (${pct}%)`}>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mini-bar-num">{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}?action=stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      } else {
        setError(data.message ?? "API returned an error.");
      }
    } catch {
      setError("Cannot reach the server. Make sure XAMPP is running.");
    } finally {
      setLoading(false);
    }
  };

  const totalFiles = stats
    ? Object.values(stats.overall).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="reports-page">

      <div className="reports-header">
        <p className="reports-sub">
          {loading ? "Loading…" : error ? "" : (
            <>
              <strong style={{ color: "var(--accent)" }}>{totalFiles}</strong> total files ·{" "}
              <strong style={{ color: "var(--accent)" }}>{stats?.total_students ?? 0}</strong> students ·{" "}
              <strong style={{ color: "#4caf82" }}>{stats?.approved_total ?? 0}</strong> approved to database
            </>
          )}
        </p>
        <button className="refresh-btn" onClick={fetchStats} disabled={loading}>
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="message error" style={{ marginBottom: 24 }}>
          ⚠️ {error}
          <button className="retry-btn" onClick={fetchStats}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading report data…</span>
        </div>
      ) : !error && stats && (
        <>
          <section className="section">
            <div className="section-label">File Status Overview</div>
            <div className="stat-grid">
              {Object.entries(STATUS_META).map(([key, meta], i) => (
                <StatCard
                  key={key}
                  icon={meta.icon}
                  label={meta.label}
                  value={stats.overall[key] ?? 0}
                  color={meta.color}
                  bg={meta.bg}
                  delay={i * 60}
                />
              ))}
              <StatCard
                icon="🗄️"
                label="In Main Database"
                value={stats.approved_total}
                color="#e8ff47"
                bg="rgba(232,255,71,0.08)"
                delay={4 * 60}
              />
              <StatCard
                icon="🎓"
                label="Total Users"
                value={stats.total_students}
                color="#47c6ff"
                bg="rgba(71,198,255,0.08)"
                delay={5 * 60}
              />
            </div>
          </section>

          <section className="section">
            <div className="section-label">Per-Admin Breakdown</div>

            {stats.by_admin.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No data yet</div>
                <div className="empty-sub">Files will appear here once students start submitting.</div>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Students</th>
                      <th>Total Files</th>
                      <th style={{ color: STATUS_META.reviewing.color }}>Reviewing</th>
                      <th style={{ color: STATUS_META.need_revisions.color }}>Need Revisions</th>
                      <th style={{ color: STATUS_META.passed.color }}>Passed</th>
                      <th style={{ color: STATUS_META.unchecked.color }}>Unchecked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_admin.map((row, i) => (
                      <tr key={row.admin} style={{ animationDelay: `${i * 40}ms` }}>
                        <td>
                          <div className="admin-cell">
                            <div className="admin-avatar">{row.admin.charAt(0).toUpperCase()}</div>
                            <span className="admin-name">{row.admin}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-blue">{row.student_count} 🎓</span>
                        </td>
                        <td>
                          <strong>{row.total}</strong>
                        </td>
                        <td>
                          <MiniBar value={row.reviewing}      max={row.total} color={STATUS_META.reviewing.color} />
                        </td>
                        <td>
                          <MiniBar value={row.need_revisions} max={row.total} color={STATUS_META.need_revisions.color} />
                        </td>
                        <td>
                          <MiniBar value={row.passed}         max={row.total} color={STATUS_META.passed.color} />
                        </td>
                        <td>
                          <MiniBar value={row.unchecked}      max={row.total} color={STATUS_META.unchecked.color} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        .reports-page { max-width: 960px; }

        .reports-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
        }
        .reports-sub { font-size: 14px; color: var(--muted); margin: 0; }

        .refresh-btn {
          padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          font-family: var(--font-body); cursor: pointer;
          border: 1px solid var(--border); background: var(--panel); color: var(--muted);
          transition: all 0.15s;
        }
        .refresh-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .retry-btn {
          margin-left: 12px; padding: 4px 12px; border-radius: 6px; font-size: 12px;
          font-weight: 600; cursor: pointer; border: 1px solid currentColor;
          background: transparent; color: inherit; font-family: var(--font-body);
        }

        .loading-state {
          display: flex; align-items: center; gap: 12px;
          color: var(--muted); font-size: 14px; padding: 48px 0;
        }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sections ── */
        .section { margin-bottom: 36px; }
        .section-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; color: var(--muted); margin-bottom: 14px;
        }

        /* ── Stat cards ── */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }
        .stat-card {
          background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
          padding: 20px 18px; position: relative; overflow: hidden;
          transition: border-color 0.18s, transform 0.18s;
          animation: fadeUp 0.35s ease both;
        }
        .stat-card:hover {
          border-color: var(--card-color);
          transform: translateY(-3px);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-icon { font-size: 22px; margin-bottom: 10px; }
        .stat-value {
          font-family: var(--font-head); font-size: 36px; font-weight: 800;
          color: var(--card-color); line-height: 1; margin-bottom: 6px;
        }
        .stat-label {
          font-size: 12px; font-weight: 600; color: var(--muted);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .stat-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: var(--border);
        }
        .stat-bar-fill {
          height: 100%; width: 100%;
          background: var(--card-color);
          opacity: 0.5;
        }

        /* ── Admin table ── */
        .admin-table-wrap {
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 14px; overflow: hidden;
        }
        .admin-table {
          width: 100%; border-collapse: collapse; font-size: 13px;
        }
        .admin-table thead tr {
          border-bottom: 1px solid var(--border);
        }
        .admin-table th {
          padding: 12px 16px; text-align: left;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
        }
        .admin-table tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
          animation: fadeUp 0.3s ease both;
        }
        .admin-table tbody tr:last-child { border-bottom: none; }
        .admin-table tbody tr:hover { background: rgba(255,255,255,0.03); }
        .admin-table td {
          padding: 14px 16px; color: var(--text); vertical-align: middle;
        }

        .admin-cell { display: flex; align-items: center; gap: 10px; }
        .admin-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(232,255,71,0.12);
          border: 1px solid rgba(232,255,71,0.25);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-head); font-size: 13px; font-weight: 700;
          color: var(--accent); flex-shrink: 0;
        }
        .admin-name { font-weight: 600; color: var(--text); }

        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 700;
        }
        .badge-blue {
          background: rgba(71,198,255,0.1);
          border: 1px solid rgba(71,198,255,0.25);
          color: #47c6ff;
        }

        /* ── Mini progress bar ── */
        .mini-bar-wrap { display: flex; align-items: center; gap: 8px; min-width: 80px; }
        .mini-bar-track {
          flex: 1; height: 6px; background: var(--border);
          border-radius: 3px; overflow: hidden;
        }
        .mini-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
        .mini-bar-num { font-size: 13px; font-weight: 600; color: var(--text); min-width: 18px; text-align: right; }

        /* ── Empty state ── */
        .empty-state { text-align: center; padding: 48px 24px; color: var(--muted); }
        .empty-icon  { font-size: 40px; margin-bottom: 14px; }
        .empty-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-sub   { font-size: 13px; }

        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .admin-table th:nth-child(n+4),
          .admin-table td:nth-child(n+4) { display: none; }
        }
      `}</style>
    </div>
  );
}
