import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }          from "./context/AuthContext";
import { ThemeProvider }         from "./context/ThemeContext";
import { NotificationProvider }  from "./context/NotificationContext";
import ProtectedRoute   from "./components/ProtectedRoute";
import LoginPage        from "./pages/LoginPage";
import RegisterPage     from "./pages/RegisterPage";
import DashboardPage    from "./pages/DashboardPage";
import PdfReviewPage    from "./pages/PdfReviewPage";
import PdfViewerPage    from "./pages/PdfViewerPage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {}
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/"        element={<Navigate to="/login" replace />} />
              <Route path="/login"   element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/file/:fileId" element={<PdfViewerPage />} />
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="/review/:fileId" element={<PdfReviewPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
