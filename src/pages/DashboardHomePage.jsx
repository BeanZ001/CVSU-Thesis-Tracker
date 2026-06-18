import { useAuth } from "../hooks/useAuth";
import { resolveRole } from "../rbacConfig";

const SHORTCUTS = {
  admin: [
    { page: "PDFs",     icon: "📂", label: "PDF Uploads",    desc: "Upload & manage thesis documents" },
    { page: "Reports",  icon: "📊", label: "Reports",        desc: "View analytics & platform metrics" },
    { page: "Settings", icon: "⚙️", label: "Settings",       desc: "Configure system preferences" },
    { page: "Users",    icon: "👥", label: "User Management", desc: "Manage accounts & roles" },
  ],
  student: [
    { page: "PDFs",     icon: "📂", label: "My Submissions", desc: "Upload & track your thesis files" },
    { page: "Messages", icon: "💬", label: "Messages",       desc: "Chat with your advisor or admin" },
    { page: "Settings", icon: "⚙️", label: "Settings",       desc: "Adjust your preferences" },
  ],
};

export default function DashboardHomePage({ onNavigate }) {
  const { user } = useAuth();
  const role = resolveRole(user?.role);
  const shortcuts = SHORTCUTS[role] ?? [];

  return (
    <div className="dash-home">

      <div className="dash-intro">
        <div className="dash-intro-badge">📘 About Thesis_Tracker</div>
        <h2 className="dash-intro-title">
          Your academic research,<br />organised in one place.
        </h2>
        <p className="dash-intro-body">
          Thesis_Tracker is a platform built to streamline the thesis submission
          and review process. Students upload their documents, track review
          statuses in real time, and communicate directly with administrators —
          while admins manage submissions, annotate PDFs, generate reports, and
          oversee every stage of the academic pipeline from a single dashboard.
        </p>
        <div className="dash-intro-pills">
          <span className="dash-pill">📄 PDF Submission</span>
          <span className="dash-pill">🔍 Expert Review</span>
          <span className="dash-pill">💬 Direct Messaging</span>
          <span className="dash-pill">📊 Analytics</span>
        </div>
      </div>

      <div className="dash-shortcuts-header">
        <span className="dash-shortcuts-title">Quick Access</span>
        <span className="dash-shortcuts-sub">Jump straight to where you need to go</span>
      </div>

      <div className="dash-shortcuts">
        {shortcuts.map(({ page, icon, label, desc }) => (
          <button
            key={page}
            className="dash-shortcut-card"
            onClick={() => onNavigate(page)}
          >
            <span className="dash-shortcut-icon">{icon}</span>
            <span className="dash-shortcut-label">{label}</span>
            <span className="dash-shortcut-desc">{desc}</span>
            <span className="dash-shortcut-arrow">→</span>
          </button>
        ))}
      </div>

    </div>
  );
}
