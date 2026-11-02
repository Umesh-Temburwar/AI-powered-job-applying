import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
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
import { SiteAccessGate } from './components/common/SiteAccessGate';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SiteAccessGate>
            <BrowserRouter>
              <ApiOfflineModal />
              <Routes>
                {/* Public Marketing & Auth Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
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
          </SiteAccessGate>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
