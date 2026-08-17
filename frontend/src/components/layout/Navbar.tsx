import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  LifeBuoy,
  UserCircle2,
  CheckSquare,
  LogOut,
  Search,
  Menu,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const citizenNavItems = [
  { to: "/citizen", label: "Dashboard", icon: LayoutGrid },
  { to: "/citizen/report", label: "Submit Report", icon: ShieldAlert },
  { to: "/citizen/track-report", label: "Track Reports", icon: Search },
  { to: "/citizen/live-map", label: "Live Map", icon: MapPinned },
  { to: "/citizen/alerts", label: "Alerts", icon: AlertTriangle },
];

const governmentNavItems = [
  { to: "/government/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/government/verify", label: "Verify Reports", icon: CheckSquare },
  {
    to: "/government/emergency-operations",
    label: "Emergency",
    icon: LifeBuoy,
  },
  {
    to: "/government/live-map",
    label: "Live Map",
    icon: MapPinned,
  },
];

interface NavbarProps {
  onOpenMobileDrawer?: () => void;
}

export default function Navbar({
  onOpenMobileDrawer,
}: NavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isCitizen = !user || user.role === "citizen";

  const navItems = isCitizen
    ? citizenNavItems
    : governmentNavItems;

  const profilePath = isCitizen
    ? "/citizen/profile"
    : "/government/profile";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-linear-to-r from-[#356267] to-[#41737c] text-[#effefb] shadow-md">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo / Brand */}
        <div
          className="flex cursor-pointer select-none items-center gap-3"
          onClick={() =>
            navigate(
              isCitizen
                ? "/citizen"
                : "/government/dashboard"
            )
          }
        >
          <img
            src="/jaldrishti_logo_white.png"
            alt="JalDrishti Logo"
            className="h-9 w-auto shrink-0 object-contain"
          />

          <div>
            <span className="block text-base font-bold leading-tight tracking-wide text-[#c2f2f2] sm:text-lg">
              JalDrishti
            </span>

            <span className="block text-[10px] text-[#effefb]/80 sm:text-xs">
              {isCitizen
                ? "Citizen Disaster Portal"
                : "Government Response Hub"}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={
                  item.to === "/citizen" ||
                  item.to === "/government/dashboard"
                }
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#00b3b3] font-bold text-[#23565c] shadow-sm"
                      : "text-[#effefb] hover:bg-[#c2f2f2]/20 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}

          {/* SOS - Citizen Only */}
          {isCitizen && (
            <button
              type="button"
              onClick={() => navigate("/citizen/sos")}
              className="flex items-center gap-1.5 rounded-full bg-[#ff4a4a] px-3.5 py-2 text-sm font-black text-white shadow-sm transition-all duration-200 hover:bg-[#7f0505] hover:shadow-md"
            >
              <LifeBuoy className="h-4 w-4" />
              SOS
            </button>
          )}

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate(profilePath)}
            className="flex items-center gap-2 rounded-full border border-[#c2f2f2]/40 px-3.5 py-2 text-sm font-medium text-[#effefb] transition-all duration-200 hover:border-[#c2f2f2]/70 hover:bg-[#c2f2f2]/15"
          >
            <UserCircle2 className="h-4 w-4" />
            {user?.name ?? "Profile"}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-[#c2f2f2]/30 px-3 py-2 text-sm font-medium text-[#effefb]/80 transition-all duration-200 hover:border-[#c2f2f2]/60 hover:bg-[#c2f2f2]/10"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>

        {/* Mobile / Tablet Controls */}
        <div className="flex items-center gap-2 lg:hidden">

          {/* Open Sidebar */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c2f2f2]/30 text-[#effefb] transition hover:bg-[#c2f2f2]/15"
            title="Open navigation"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c2f2f2]/30 text-[#effefb]/80 transition hover:border-[#c2f2f2]/60 hover:bg-[#c2f2f2]/10"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}