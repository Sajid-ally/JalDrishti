import { NavLink } from "react-router-dom";
import {
  Menu,
  X,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  Send,
  ClipboardCheck,
  CheckSquare,
  LifeBuoy,
  Siren,
  Users,
  User,
  Search,
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
    to: "/citizen/report",
    label: "Submit Report",
    icon: ShieldAlert,
    end: false,
  },
  {
    to: "/citizen/track-report",
    label: "Track Your Reports",
    icon: Search,
    end: false,
  },
  {
    to: "/citizen/rescue",
    label: "Rescue Request",
    icon: Send,
    end: false,
  },
  {
    to: "/citizen/relief-tracking",
    label: "Relief Tracking",
    icon: ClipboardCheck,
    end: false,
  },
  {
    to: "/citizen/live-map",
    label: "Live Map",
    icon: MapPinned,
    end: false,
  },
  {
    to: "/citizen/missing",
    label: "Missing Persons",
    icon: Users,
    end: false,
  },
  {
    to: "/citizen/profile",
    label: "Profile",
    icon: User,
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
    label: "Alerts / News Feed",
    icon: Siren,
    end: false,
  },
  {
    to: "/government/live-map",
    label: "Live Map",
    icon: MapPinned,
    end: false,
  },
  {
    to: "/government/missing",
    label: "Missing Persons",
    icon: Users,
    end: false,
  },
  {
    to: "/government/profile",
    label: "Profile",
    icon: User,
    end: false,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
  isMobileDrawer = false,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();

  const isCitizen = !user || user.role === "citizen";
  const sidebarItems = isCitizen ? citizenItems : governmentItems;

  if (isMobileDrawer) {
    return (
      <div className="flex h-full flex-col bg-white p-5">
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(53,98,103,0.14)]">
          <div>
            <span className="text-base font-bold text-[var(--color-ocean)]">
              CoastalEye
            </span>
            <p className="text-[11px] text-[var(--color-medium-teal)]">
              {isCitizen ? "Citizen Quick Menu" : "Gov Command Menu"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-pale-aqua)] text-[var(--color-dark-teal)] hover:bg-[var(--color-aqua)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[var(--color-ocean)] text-white shadow-sm font-bold"
                      : "text-[var(--color-dark-teal)] hover:bg-[var(--color-pale-aqua)]/50"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  }

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
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Menu */}
      <div
        className={`
          flex-1
          ${collapsed ? "px-3" : "px-5"}
          overflow-y-auto
        `}
      >
        {!collapsed && (
          <p
            className="
              mb-4
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

        <nav className="flex flex-col gap-1.5">
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
                      ? "bg-(--color-aqua) text-(--color-dark-teal) font-bold shadow-xs"
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
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}