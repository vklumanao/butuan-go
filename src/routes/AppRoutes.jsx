import { Route, Routes } from "react-router-dom";
import { USER_ROLES } from "@/lib/constants";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { RoleRoute } from "./RoleRoute";
import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage";
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
import { AppShell } from "@/components/layout/AppShell";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/safety" element={<SafetyPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
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
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
