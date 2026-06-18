import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: "48px 56px" }}>
        <div className="content-card denied-card">
          <div className="denied-badge">⛔ Access Denied</div>
          <p>
            Your role (<strong>{user.role}</strong>) does not have permission
            to view this page. Contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
