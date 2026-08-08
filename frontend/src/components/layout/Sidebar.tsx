import { NavLink } from "react-router-dom";
import {
  Menu,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  Send,
  ClipboardCheck,
  CheckSquare,
  LifeBuoy,
  Siren,
  Users,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

const citizenItems = [
  {
    to: "/citizen",
    label: "Dashboard",
    icon: LayoutGrid,
    end: true,
  },
  {
    to: "/citizen/live-map",
    label: "Live Map",
    icon: MapPinned,
    end: false,
  },
  {
    to: "/citizen/report",
    label: "Report Hazard",
    icon: ShieldAlert,
    end: false,
  },
  {
    to: "/citizen/track-report",
    label: "Track Report",
    icon: ClipboardCheck,
    end: false,
  },
  {
    to: "/citizen/rescue",
    label: "Rescue Request",
    icon: Send,
    end: false,
  },
];

const governmentItems = [
  {
    to: "/government/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    end: true,
  },
  {
    to: "/government/verify",
    label: "Verify Reports",
    icon: CheckSquare,
    end: false,
  },
  {
    to: "/government/rescue",
    label: "Rescue Requests",
    icon: LifeBuoy,
    end: false,
  },
  {
    to: "/government/alerts",
    label: "Disaster Alerts",
    icon: Siren,
    end: false,
  },
  {
    to: "/government/missing",
    label: "Missing Persons",
    icon: Users,
    end: false,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
}: SidebarProps) {
  const { user } = useAuth();

  const isCitizen = !user || user.role === "citizen";

  const sidebarItems = isCitizen
    ? citizenItems
    : governmentItems;

  return (
    <aside
      className={`
        hidden lg:flex
        sticky top-0
        h-screen
        shrink-0
        flex-col
        border-r border-[rgba(53,98,103,0.16)]
        bg-white
        transition-all duration-300
        ${collapsed ? "w-20" : "w-72"}
      `}
    >
      {/* Sidebar Header */}
      <div
        className={`
          flex
          items-center
          ${collapsed ? "justify-center" : "justify-between"}
          px-5
          py-5
        `}
      >
        {/* Menu button */}
        <button
          type="button"
          onClick={onToggle}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-(--color-pale-aqua)
            text-(--color-dark-teal)
            transition
            hover:bg-(--color-aqua)
          "
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Menu */}
      <div
        className={`
          flex-1
          ${collapsed ? "px-3" : "px-5"}
        `}
      >
        {!collapsed && (
          <p
            className="
              mb-5
              px-1
              text-xs
              font-semibold
              uppercase
              tracking-[0.3em]
              text-(--color-medium-teal)
            "
          >
            Quick Access
          </p>
        )}

        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  py-3
                  text-sm
                  font-medium
                  transition-all
                  duration-200

                  ${
                    isActive
                      ? "bg-(--color-aqua) text-(--color-dark-teal)"
                      : "text-(--color-medium-teal) hover:bg-(--color-pale-aqua)"
                  }

                  ${
                    collapsed
                      ? "justify-center px-2"
                      : "px-3"
                  }
                  `
                }
              >
                <Icon className="h-5 w-5 shrink-0" />

                {!collapsed && (
                  <span>{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}