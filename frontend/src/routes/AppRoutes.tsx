import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import MainLayout from "../layouts/MainLayout";

import Landing from "../pages/Landing/Landing";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/signup";
import ForgotPassword from "../pages/Auth/ForgotPassword";

import CitizenDashboard from "../pages/Citizen/Dashboard";
import ReportHazard from "../pages/Citizen/ReportHazard";
import CitizenLiveMap from "../pages/Citizen/LiveMap";
import CitizenMissingPersons from "../pages/Citizen/MissingPersons";
import CitizenAlerts from "../pages/Citizen/Alerts";
import SOS from "../pages/Citizen/SOS";
import RescueRequest from "../pages/Citizen/RescueRequest";
import CitizenProfile from "../pages/Citizen/Profile";
import MyReports from "../pages/Citizen/MyReports";
import ReportDetails from "../pages/Citizen/ReportDetails";

import ReliefTracking from "../pages/Citizen/ReliefTracking";

import GovernmentDashboard from "../pages/Government/Dashboard";
import VerifyReports from "../pages/Government/VerifyReports";
import GovernmentRescueRequests from "../pages/Government/RescueRequests";
import DisasterAlerts from "../pages/Government/DisasterAlerts";
import GovernmentMissingPersons from "../pages/Government/MissingPersons";
import GovernmentProfile from "../pages/Government/Profile";


import Notifications from "../pages/Shared/Notifications";
import Settings from "../pages/Shared/Settings";
import NotFound from "../pages/Shared/NotFound";

function withLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Citizen */}
        <Route path="/citizen" element={withLayout(<CitizenDashboard />)} />
        <Route
          path="/citizen/dashboard"
          element={<Navigate to="/citizen" replace />}
        />
        <Route path="/citizen/report" element={withLayout(<ReportHazard />)} />
        <Route path="/citizen/live-map" element={withLayout(<CitizenLiveMap />)} />
        <Route
          path="/citizen/missing"
          element={withLayout(<CitizenMissingPersons />)}
        />
        <Route path="/citizen/alerts" element={withLayout(<CitizenAlerts />)} />
        <Route path="/citizen/sos" element={withLayout(<SOS />)} />
        <Route path="/citizen/rescue" element={withLayout(<RescueRequest />)} />
        <Route path="/citizen/relief-tracking" element={withLayout(<ReliefTracking />)} />
        <Route path="/citizen/track-report" element={withLayout(<ReliefTracking />)} />
        <Route path="/citizen/profile" element={withLayout(<CitizenProfile />)} />
        <Route path="/citizen/reports" element={withLayout(<MyReports />)} />
        <Route
          path="/citizen/reports/:id"
          element={withLayout(<ReportDetails />)}
        />

        {/* Government */}
        <Route
          path="/government"
          element={<Navigate to="/government/dashboard" replace />}
        />
        <Route
          path="/government/dashboard"
          element={withLayout(<GovernmentDashboard />)}
        />
        <Route
          path="/government/live-map"
          element={withLayout(<CitizenLiveMap />)}
        />
        <Route
          path="/government/verify"
          element={withLayout(<VerifyReports />)}
        />
        <Route
          path="/government/rescue"
          element={withLayout(<GovernmentRescueRequests />)}
        />
        <Route
          path="/government/alerts"
          element={withLayout(<DisasterAlerts />)}
        />
        <Route
          path="/government/missing"
          element={withLayout(<GovernmentMissingPersons />)}
        />
        <Route
          path="/government/profile"
          element={withLayout(<GovernmentProfile />)}
        />


        <Route path="/notifications" element={withLayout(<Notifications />)} />
        <Route path="/settings" element={withLayout(<Settings />)} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
