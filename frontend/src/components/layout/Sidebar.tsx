import { NavLink, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, LogOut, MapPinned, Send, ShieldAlert } from "lucide-react";

const sidebarItems = [
  { to: "/citizen/live-map", label: "Map", icon: MapPinned },
  { to: "/citizen/report", label: "Report Hazard", icon: ShieldAlert },
  { to: "/citizen/sos", label: "Emergency SOS", icon: AlertTriangle },
  { to: "/citizen/rescue", label: "Rescue Request", icon: Send },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={`hidden border-r border-[rgba(53,98,103,0.16)] bg-[var(--color-soft-mint)] p-4 lg:flex lg:flex-col ${collapsed ? "w-20" : "w-72"}`}>
      <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={onToggle}
          className="mb-4 flex items-center justify-center rounded-full bg-[var(--color-pale-aqua)] p-2 text-[var(--color-dark-teal)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-medium-teal)]">
          {collapsed ? "Menu" : "Quick access"}
        </p>
        <div className="mt-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--color-dark-teal)] text-[var(--color-soft-mint)]"
                      : "text-[var(--color-medium-teal)] hover:bg-[var(--color-pale-aqua)]"
                  } ${collapsed ? "justify-center px-2" : ""}`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-3 text-sm font-semibold text-[var(--color-dark-teal)] shadow-sm transition hover:bg-[var(--color-pale-aqua)]"
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
