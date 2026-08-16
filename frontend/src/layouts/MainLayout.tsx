import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  ShieldAlert,
  Search,
  MapPinned,
  Menu,
  CheckSquare,
  LifeBuoy,
  Siren,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import useAuth from "../hooks/useAuth";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user } = useAuth();

  const isCitizen = !user || user.role === "citizen";

  return (
    <div className="min-h-screen bg-(--color-soft-mint) text-(--color-dark-teal) flex flex-col selection:bg-(--color-pale-aqua) overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />

      {/* Main Container */}
      <div className="flex w-full flex-1 relative">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />

        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE BOTTOM NAVIGATION (Touch-friendly & one-handed reach)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[rgba(53,98,103,0.16)] px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {isCitizen ? (
            <>
              <NavLink
                to="/citizen"
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <LayoutGrid className="h-5 w-5" />
                <span className="text-[10px]">Home</span>
              </NavLink>

              <NavLink
                to="/citizen/report"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <ShieldAlert className="h-5 w-5" />
                <span className="text-[10px]">Report</span>
              </NavLink>

              <NavLink
                to="/citizen/track-report"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <Search className="h-5 w-5" />
                <span className="text-[10px]">Track</span>
              </NavLink>

              <NavLink
                to="/citizen/live-map"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <MapPinned className="h-5 w-5" />
                <span className="text-[10px]">Map</span>
              </NavLink>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px]">More</span>
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/government/dashboard"
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <LayoutGrid className="h-5 w-5" />
                <span className="text-[10px]">Home</span>
              </NavLink>

              <NavLink
                to="/government/verify"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <CheckSquare className="h-5 w-5" />
                <span className="text-[10px]">Verify</span>
              </NavLink>

              <NavLink
                to="/government/emergency-operations"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <LifeBuoy className="h-5 w-5" />
                <span className="text-[10px]">Emergency</span>
              </NavLink>

              <NavLink
                to="/government/live-map"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                    isActive
                      ? "text-(--color-ocean) font-bold"
                      : "text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
                  }`
                }
              >
                <Siren className="h-5 w-5" />
                <span className="text-[10px]">Live-Alerts</span>
              </NavLink>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-(--color-medium-teal)/70 hover:text-(--color-dark-teal)"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px]">More</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE SLIDE-OUT OFF-CANVAS DRAWER
      ───────────────────────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-9999 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-4/5 max-w-xs h-full bg-white shadow-2xl z-10 animate-slideRight">
            <Sidebar
              collapsed={false}
              onToggle={() => {}}
              isMobileDrawer
              onCloseMobile={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
