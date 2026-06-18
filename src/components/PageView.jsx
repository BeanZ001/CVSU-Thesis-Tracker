import { useAuth }        from "../hooks/useAuth";
import { PAGE_CONTENT, resolveRole } from "../rbacConfig";
import PdfUploadPage        from "../pages/PdfUploadPage";
import UserManagementPage   from "../pages/UserManagementPage";
import MessagesPage         from "../pages/MessagesPage";
import ThesisSearchPage     from "../pages/ThesisSearchPage";
import ReportsPage          from "../pages/ReportsPage";
import SettingsPage         from "../pages/SettingsPage";
import DashboardHomePage    from "../pages/DashboardHomePage";

export default function PageView({ pageName, onNavigate }) {
  const { user } = useAuth();
  const role     = resolveRole(user?.role);

 
  if (pageName === "Dashboard") return <DashboardHomePage onNavigate={onNavigate} />;
  if (pageName === "PDFs")      return <PdfUploadPage />;
  if (pageName === "Users")     return <UserManagementPage />;
  if (pageName === "Messages")  return <MessagesPage />;
  if (pageName === "Database")  return <ThesisSearchPage />;
  if (pageName === "Reports")   return <ReportsPage />;
  if (pageName === "Settings")  return <SettingsPage />;

  
  const content = PAGE_CONTENT[role]?.[pageName];

  if (content) {
    return (
      <div className="content-card">
        <p>{content.body}</p>
      </div>
    );
  }

  return (
    <div className="content-card denied-card">
      <div className="denied-badge">⛔ Access Denied</div>
      <p>
        Your current role does not have permission to view this page.
        Please contact your administrator to request access.
      </p>
    </div>
  );
}
