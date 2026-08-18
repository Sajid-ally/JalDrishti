import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

import Landing from "../pages/Landing/Landing";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/signup";
import ForgotPassword from "../pages/Auth/ForgotPassword";

import CitizenDashboard from "../pages/Citizen/Dashboard";
import ReportHazard from "../pages/Citizen/ReportHazard";
import CitizenLiveMap from "../pages/Citizen/LiveMap";
import CitizenAlerts from "../pages/Citizen/Alerts";
import SOS from "../pages/Citizen/SOS";
import RescueRelief from "../pages/Citizen/RescueRelief";
import CitizenProfile from "../pages/Citizen/Profile";
import MyReports from "../pages/Citizen/MyReports";
import ReportDetails from "../pages/Citizen/ReportDetails";
import TrackReport from "../pages/Citizen/TrackReport";

import GovernmentDashboard from "../pages/Government/Dashboard";
import ReviewReports from "../pages/Government/ReviewReports";
import VerifyReports from "../pages/Government/VerifyReports";
import DepartmentTracking from "../pages/Government/DepartmentTracking";
import EmergencyOperations from "../pages/Government/EmergencyOperations";
import GovernmentProfile from "../pages/Government/Profile";
import GovernmentLiveMap from "../pages/Government/LiveMap";
import SocialMediaVerification from "../pages/Government/SocialMediaVerification";

import Notifications from "../pages/Shared/Notifications";
import Settings from "../pages/Shared/Settings";
import NotFound from "../pages/Shared/NotFound";


function withLayout(page: ReactElement) {
  return (
    <ProtectedRoute>
      <MainLayout>{page}</MainLayout>
    </ProtectedRoute>
  );
}


export default function AppRoutes() {
  return (
    <BrowserRouter>

      <Toaster position="top-right" />

      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        {/* =====================================================
            CITIZEN ROUTES
        ===================================================== */}

        <Route
          path="/citizen"
          element={withLayout(<CitizenDashboard />)}
        />

        <Route
          path="/citizen/dashboard"
          element={<Navigate to="/citizen" replace />}
        />

        <Route
          path="/citizen/report"
          element={withLayout(<ReportHazard />)}
        />

        <Route
          path="/citizen/submit-report"
          element={withLayout(<ReportHazard />)}
        />

        <Route
          path="/citizen/track-report"
          element={withLayout(<TrackReport />)}
        />

        {/* Team compatibility */}
        <Route
          path="/citizen/track-reports"
          element={
            <Navigate
              to="/citizen/track-report"
              replace
            />
          }
        />

        <Route
          path="/citizen/live-map"
          element={withLayout(<CitizenLiveMap />)}
        />

        <Route
          path="/citizen/alerts"
          element={withLayout(<CitizenAlerts />)}
        />

        <Route
          path="/citizen/sos"
          element={withLayout(<SOS />)}
        />

        <Route
          path="/citizen/rescue-relief"
          element={withLayout(<RescueRelief />)}
        />

        {/* Backwards compatible routes */}

        <Route
          path="/citizen/rescue"
          element={
            <Navigate
              to="/citizen/rescue-relief?tab=request"
              replace
            />
          }
        />

        <Route
          path="/citizen/relief-tracking"
          element={
            <Navigate
              to="/citizen/rescue-relief?tab=status"
              replace
            />
          }
        />

        <Route
          path="/citizen/profile"
          element={withLayout(<CitizenProfile />)}
        />

        <Route
          path="/citizen/reports"
          element={withLayout(<MyReports />)}
        />

        <Route
          path="/citizen/reports/:id"
          element={withLayout(<ReportDetails />)}
        />


        {/* =====================================================
            GOVERNMENT ROUTES
        ===================================================== */}

        <Route
          path="/government"
          element={
            <Navigate
              to="/government/dashboard"
              replace
            />
          }
        />

        <Route
          path="/government/dashboard"
          element={withLayout(<GovernmentDashboard />)}
        />

        <Route
          path="/government/review-reports"
          element={withLayout(<ReviewReports />)}
        />

        <Route
          path="/government/department-tracking"
          element={withLayout(<DepartmentTracking />)}
        />

        <Route
          path="/government/emergency-operations"
          element={withLayout(<EmergencyOperations />)}
        />

        <Route
          path="/government/verify"
          element={withLayout(<VerifyReports />)}
        />

        {/* Social Media Verification */}
        <Route
          path="/government/social-media-verification"
          element={withLayout(<SocialMediaVerification />)}
        />
        <Route
          path="/government/social-verification"
          element={<Navigate to="/government/social-media-verification" replace />}
        />
        <Route
          path="/government/social-reports"
          element={<Navigate to="/government/social-media-verification" replace />}
        />

        <Route
          path="/government/live-map"
          element={withLayout(<GovernmentLiveMap />)}
        />

        <Route
          path="/government/profile"
          element={withLayout(<GovernmentProfile />)}
        />


        {/* =====================================================
            SHARED PROTECTED ROUTES
        ===================================================== */}

        <Route
          path="/notifications"
          element={withLayout(<Notifications />)}
        />

        <Route
          path="/settings"
          element={withLayout(<Settings />)}
        />


        {/* =====================================================
            FALLBACK
        ===================================================== */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>
  );
}