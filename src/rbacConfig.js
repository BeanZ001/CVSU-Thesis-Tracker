

import FileView from "./pages/FileView";

export const ROLE_CONFIG = {
  admin: {
    label : "Admin",
    color : "#ff6b6b",
    icon  : "🛡️",
    pages : ["Dashboard", "Users", "Settings", "Reports", "PDFs", "Messages", "Database"],
  },
  student: {
    label : "Student",
    color : "#47c6ff",
    icon  : "📚",
    pages : ["Dashboard", "PDFs", "Messages", "Database", "Settings"],
  },
};

export const PAGE_CONTENT = {
  admin: {
    Dashboard : { heading: "Admin Dashboard",     body: "Welcome, Admin. You have full access to every section of the platform. Use the sidebar to jump to User Management, System Settings, Reports, or PDF Review. All actions you take here are logged for auditing purposes." },
    Users     : { heading: "User Management",     body: "View and manage every account registered on the platform. You can create new users, assign or change their roles, suspend accounts, reset passwords, and permanently delete users. Changes take effect immediately — handle this section with care." },
    Settings  : { heading: "System Settings",     body: "Configure global platform behaviour: authentication policies, session timeouts, email notification templates, API rate limits, and third-party integration credentials. All changes here affect every user on the system and apply instantly." },
    Reports   : { heading: "Reports & Analytics", body: "Review platform-wide metrics including daily active users, content publication rates, error logs, and system uptime. You can filter by date range and export any report as a CSV or PDF for external review." },
    Messages  : { heading: "Messages",            body: "" },
    Database  : { heading: "Thesis Database",     body: "" },
  },
  student: {
    Dashboard : { heading: "Student Dashboard",   body: "Welcome! Upload your thesis documents in the PDFs section and send them to an admin for review. You can track the status of each submission — Unchecked, Reviewing, Passed, or Need Revisions — and receive written feedback directly in the app." },
    PDFs      : { heading: "My Submissions",      body: "" },
    Messages  : { heading: "Messages",            body: "" },
    Database  : { heading: "Thesis Database",     body: "" },
    Settings  : { heading: "Settings",            body: "" },
  },
};

export const PAGE_ICONS = {
  Dashboard : "⊞",
  Users     : "👥",
  Settings  : "⚙️",
  Reports   : "📊",
  Review    : "🔍",
  Content   : "📝",
  Media     : "🖼️",
  FileView  : "📁",
  Messages  : "💬",
  PDFs      : "📂",
  Database  : "🗄️",
};

export function resolveRole(raw) {
  return ROLE_CONFIG[raw] ? raw : "student";
}
