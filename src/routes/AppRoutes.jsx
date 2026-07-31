import { Navigate, Route, Routes } from "react-router-dom";
import { USER_ROLES } from "@/lib/constants";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { RoleRoute } from "./RoleRoute";
import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage";
import { OnboardingPage } from "@/pages/auth/OnboardingPage";
import { UnauthorizedPage } from "@/pages/public/UnauthorizedPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";
import { TermsPage } from "@/pages/public/TermsPage";
import { PrivacyPage } from "@/pages/public/PrivacyPage";
import { SafetyPage } from "@/pages/public/SafetyPage";
import { RequestorDashboard } from "@/pages/requestor/RequestorDashboard";
import { CreateRequestPage } from "@/pages/requestor/CreateRequestPage";
import { RequestorRequestsPage } from "@/pages/requestor/RequestorRequestsPage";
import { RequestDetailsPage } from "@/pages/requestor/RequestDetailsPage";
import { EditRequestPage } from "@/pages/requestor/EditRequestPage";
import { EditRequestLocationPage } from "@/pages/requestor/EditRequestLocationPage";
import { RunnerDashboard } from "@/pages/runner/RunnerDashboard";
import {
  RunnerAvailableRequestsPage,
  RunnerTasksPage,
} from "@/pages/runner/RunnerRequestsPages";
import { RunnerRequestDetailsPage } from "@/pages/runner/RunnerRequestDetailsPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminRequestsPage } from "@/pages/admin/AdminRequestsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AppShell } from "@/components/layout/AppShell";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/forgot-password"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/reset-password"
        element={<Navigate to="/login" replace />}
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/safety" element={<SafetyPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RoleRoute allowedRole={USER_ROLES.REQUESTOR} />}>
          <Route element={<AppShell />}>
            <Route
              path="/requestor/dashboard"
              element={<RequestorDashboard />}
            />
            <Route path="/requestor/profile" element={<ProfilePage />} />
            <Route
              path="/requestor/requests"
              element={<RequestorRequestsPage />}
            />
            <Route
              path="/requestor/requests/new"
              element={<CreateRequestPage />}
            />
            <Route
              path="/requestor/requests/:requestId"
              element={<RequestDetailsPage />}
            />
            <Route
              path="/requestor/requests/:requestId/edit"
              element={<EditRequestPage />}
            />
            <Route
              path="/requestor/requests/:requestId/location"
              element={<EditRequestLocationPage />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRole={USER_ROLES.RUNNER} />}>
          <Route element={<AppShell />}>
            <Route path="/runner/dashboard" element={<RunnerDashboard />} />
            <Route path="/runner/profile" element={<ProfilePage />} />
            <Route
              path="/runner/requests"
              element={<RunnerAvailableRequestsPage />}
            />
            <Route
              path="/runner/requests/:requestId"
              element={<RunnerRequestDetailsPage />}
            />
            <Route path="/runner/tasks" element={<RunnerTasksPage />} />
            <Route
              path="/runner/tasks/:requestId"
              element={<RunnerRequestDetailsPage />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRole={USER_ROLES.ADMIN} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/requests" element={<AdminRequestsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
