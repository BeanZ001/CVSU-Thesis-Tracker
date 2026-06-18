import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { ROLE_CONFIG, PAGE_ICONS, resolveRole } from "../rbacConfig";

export default function Sidebar({ activePage, onPageChange }) {
  const { user, logout } = useAuth();
  const { resetTheme } = useTheme();

  
  const role     = resolveRole(user?.role);
  const roleConf = ROLE_CONFIG[role];

  function handleSignOut() {
    logout();      
    resetTheme();  
  }

  return (
    <aside
      className="sidebar"
      
      style={{ "--role-color": roleConf.color }}
    >
      {}
      <div className="sidebar-logo">
        <div className="sidebar-logo-dot">T</div>
        <span className="sidebar-logo-text">Thesis_Tracker</span>
      </div>

      {}
      <nav>
        {roleConf.pages.map(page => (
          <div
            key={page}
            className={`nav-item ${activePage === page ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            <span className="nav-icon">{PAGE_ICONS[page] ?? "•"}</span>
            {page}
          </div>
        ))}
      </nav>

      {}
      <div className="sidebar-footer">
        <div className="user-chip">
          {}
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            {}
            <div className="role-badge">
              {roleConf.icon} {roleConf.label}
            </div>
          </div>
        </div>

        {}
        <button className="sign-out-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
