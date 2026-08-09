import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  LifeBuoy,
  UserCircle2,
  CheckSquare,
  Users,
  Siren,
  LogOut,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const citizenNavItems = [
  { to: "/citizen", label: "Dashboard", icon: LayoutGrid },
  { to: "/citizen/report", label: "Report Hazard", icon: ShieldAlert },
  { to: "/citizen/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/citizen/missing", label: "Missing", icon: MapPinned },
];

const governmentNavItems = [
  { to: "/government/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/government/verify", label: "Verify Reports", icon: CheckSquare },
  { to: "/government/rescue", label: "Rescue", icon: LifeBuoy },
  { to: "/government/alerts", label: "Alerts", icon: Siren },
  { to: "/government/missing", label: "Missing", icon: Users },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isCitizen = !user || user.role === "citizen";
  const navItems = isCitizen ? citizenNavItems : governmentNavItems;
  const profilePath = isCitizen ? "/citizen/profile" : "/government/profile";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-linear-to-r from-[#356267] to-[#41737c] text-[#effefb] shadow-sm">
      <div className="flex items-center justify-between px-8 py-3">

        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-wide text-[#c2f2f2]">
            CoastalEye
          </span>

          <span className="text-sm text-[#effefb]/80">
            {isCitizen ? "Citizen Portal" : "Government Response Hub"}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                end={item.to === "/citizen" || item.to === "/government/dashboard"}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#00b3b3] text-[#23565c] shadow-sm"
                      : "text-[#effefb] hover:bg-[#c2f2f2]/20 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}

          {/* SOS — citizen only */}
          {isCitizen && (
            <button
              type="button"
              onClick={() => navigate("/citizen/sos")}
              className="flex items-center gap-2 rounded-full bg-[#ff4a4a] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#7f0505] hover:shadow-md"
            >
              <LifeBuoy className="h-4 w-4" />
              SOS
            </button>
          )}

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate(profilePath)}
            className="flex items-center gap-2 rounded-full border border-[#c2f2f2]/40 px-3 py-2 text-sm font-medium text-[#effefb] transition-all duration-200 hover:border-[#c2f2f2]/70 hover:bg-[#c2f2f2]/15"
          >
            <UserCircle2 className="h-4 w-4" />
            {user?.name ?? "Profile"}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-[#c2f2f2]/30 px-3 py-2 text-sm font-medium text-[#effefb]/80 transition-all duration-200 hover:border-[#c2f2f2]/60 hover:bg-[#c2f2f2]/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}