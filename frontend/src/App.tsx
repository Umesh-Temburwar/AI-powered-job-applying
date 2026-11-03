import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

import { GuidePage } from './pages/GuidePage';
import { ProfilePage } from './pages/ProfilePage';
import { ResumeManagerPage } from './pages/ResumeManagerPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { AutomationPage } from './pages/AutomationPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ApiOfflineModal } from './components/common/ApiOfflineModal';
import { HomePageGate } from './components/common/HomePageGate';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ApiOfflineModal />
            <Routes>
              {/* Public Marketing & Auth Routes */}
              <Route
                path="/"
                element={
                  <HomePageGate>
                    <LandingPage />
                  </HomePageGate>
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/confirm" element={<AuthCallbackPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/forgot-password" element={<Navigate to="/reset-password" replace />} />

              {/* Onboarding Wizard Route - removed from flow, redirects directly to home */}
              <Route path="/onboarding" element={<Navigate to="/" replace />} />

              {/* Protected App Routes */}
              <Route
                element={
                  <ProtectedRoute redirectTo="/">
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Navigate to="/applications" replace />} />
                <Route path="/guide" element={<GuidePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/resumes" element={<ResumeManagerPage />} />
                <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
                <Route path="/automation" element={<AutomationPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true} redirectTo="/">
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
