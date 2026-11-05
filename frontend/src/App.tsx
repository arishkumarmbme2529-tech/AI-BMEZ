import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { PageLoader } from './components/ui/Spinner';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstitutionListPage } from './pages/institutions/InstitutionListPage';
import { InstitutionDetailPage } from './pages/institutions/InstitutionDetailPage';
import { ApplicationListPage } from './pages/applications/ApplicationListPage';
import { ApplicationDetailPage } from './pages/applications/ApplicationDetailPage';
import { ApplicationFormPage } from './pages/applications/ApplicationFormPage';
import { DocumentListPage } from './pages/documents/DocumentListPage';
import { DocumentUploadPage } from './pages/documents/DocumentUploadPage';
import { OCRPage } from './pages/ocr/OCRPage';
import { DocumentAuthPage } from './pages/authentication/DocumentAuthPage';
import { CompliancePage } from './pages/compliance/CompliancePage';
import { InfrastructurePage } from './pages/infrastructure/InfrastructurePage';
import { OfficialVerificationPage } from './pages/verification/OfficialVerificationPage';
import { AlertsPage } from './pages/alerts/AlertsPage';
import { AuditTrailPage } from './pages/audit/AuditTrailPage';
import { RenewalsPage } from './pages/renewals/RenewalsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader message="Verifying session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                background: '#0f172a',
                color: '#fff',
                fontSize: '13px',
              },
            }}
          />
          <Routes>
            {/* Public Auth & Direct Role Demo Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/admin" element={<LoginPage />} />
            <Route path="/institute" element={<LoginPage />} />
            <Route path="/reviewer" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Enterprise Platform Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="institutions" element={<InstitutionListPage />} />
              <Route path="institutions/:id" element={<InstitutionDetailPage />} />
              <Route path="applications" element={<ApplicationListPage />} />
              <Route path="applications/new" element={<ApplicationFormPage />} />
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route path="documents" element={<DocumentListPage />} />
              <Route path="documents/upload" element={<DocumentUploadPage />} />
              <Route path="ocr" element={<OCRPage />} />
              <Route path="authentication" element={<DocumentAuthPage />} />
              <Route path="duplicates" element={<DocumentAuthPage />} />
              <Route path="compliance" element={<CompliancePage />} />
              <Route path="infrastructure" element={<InfrastructurePage />} />
              <Route path="verification" element={<OfficialVerificationPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="audit" element={<AuditTrailPage />} />
              <Route path="renewals" element={<RenewalsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

