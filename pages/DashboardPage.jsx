import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ROLE_CONFIG, PAGE_CONTENT, resolveRole } from "../rbacConfig";
import Sidebar           from "../components/Sidebar";
import PageView          from "../components/PageView";
import NotificationBell  from "../components/NotificationBell";

export default function DashboardPage() {
  const { user } = useAuth();

  const role     = resolveRole(user?.role);
  const roleConf = ROLE_CONFIG[role];

  const [activePage, setActivePage] = useState(roleConf.pages[0]);

  const heading = PAGE_CONTENT[role]?.[activePage]?.heading ?? activePage;

  return (
    <>
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />

      <div className="app-layout" style={{ "--role-color": roleConf.color }}>

        <Sidebar
          activePage={activePage}
          onPageChange={setActivePage}
        />

        <main className="main-content">

          {}
          <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="page-breadcrumb">
                {roleConf.label} · {activePage}
              </div>
              <h1 className="page-heading">{heading}</h1>
            </div>

            {}
            <div style={{ marginLeft: "auto", paddingRight: 4 }}>
              <NotificationBell />
            </div>
          </div>

          <PageView pageName={activePage} onNavigate={setActivePage} />

        </main>
      </div>
    </>
  );
}
