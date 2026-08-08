import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  LifeBuoy,
  UserCircle2,
} from "lucide-react";

const navItems = [
  { to: "/citizen", label: "Dashboard", icon: LayoutGrid },
  { to: "/citizen/report", label: "Report Hazard", icon: ShieldAlert },
  { to: "/citizen/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/citizen/missing", label: "Missing", icon: MapPinned },
];

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="bg-linear-to-r from-[#356267] to-[#41737c] text-[#effefb] shadow-sm">
      <div className="flex items-center justify-between px-8 py-3">
        
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-wide text-[#c2f2f2]">
            CoastalEye
          </span>

          <span className="text-sm text-[#effefb]/80">
            Disaster Response Hub
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                end={item.to === "/citizen"}
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

          {/* SOS */}
          <button
            type="button"
            onClick={() => navigate("/citizen/sos")}
            className="flex items-center gap-2 rounded-full bg-[#ff4a4a] px-3 py-2 text-sm font-semibold white shadow-sm transition-all duration-200 hover:bg-[#7f0505] hover:shadow-md"
          >
            <LifeBuoy className="h-4 w-4" />
            SOS
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate("/citizen/profile")}
            className="flex items-center gap-2 rounded-full border border-[#c2f2f2]/40 px-3 py-2 text-sm font-medium text-[#effefb] transition-all duration-200 hover:border-[#c2f2f2]/70 hover:bg-[#c2f2f2]/15"
          >
            <UserCircle2 className="h-4 w-4" />
            Profile
          </button>
        </nav>
      </div>
    </header>
  );
}