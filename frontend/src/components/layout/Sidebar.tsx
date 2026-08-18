import { NavLink } from "react-router-dom";
import {
  Menu,
  X,
  LayoutGrid,
  MapPinned,
  ShieldAlert,
  Send,
  Waves,
  LifeBuoy,
  Siren,
  User,
  Search,
  AlertTriangle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const citizenSections: NavSection[] = [
  {
    title: "Report & Monitor",
    items: [
      {
        to: "/citizen/report",
        label: "Submit Report",
        icon: ShieldAlert,
      },
      {
        to: "/citizen/track-report",
        label: "Track Report",
        icon: Search,
      },
      {
        to: "/citizen/live-map",
        label: "Live Map",
        icon: MapPinned,
      },
    ],
  },
  {
    title: "Emergency Services",
    items: [
      {
        to: "/citizen/sos",
        label: "SOS",
        icon: LifeBuoy,
      },
      {
        to: "/citizen/rescue-relief",
        label: "Rescue & Relief",
        icon: Send,
      },
      {
        to: "/citizen/alerts",
        label: "Disaster Alerts",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        to: "/citizen",
        label: "Dashboard",
        icon: LayoutGrid,
        end: true,
      },
      {
        to: "/citizen/profile",
        label: "Profile",
        icon: User,
      },
    ],
  },
];

const governmentSections: NavSection[] = [
  {
    title: "Report & Monitor",
    items: [
      {
        to: "/government/review-reports",
        label: "Review Reports",
        icon: Waves,
      },
      {
        to: "/government/live-map",
        label: "Live Map",
        icon: MapPinned,
      },
      {
        to: "/government/department-tracking",
        label: "Department Tracking",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Emergency Services",
    items: [
      {
        to: "/government/emergency-operations",
        label: "Rescue Operations",
        icon: Siren,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        to: "/government/dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
        end: true,
      },
      {
        to: "/government/profile",
        label: "Profile",
        icon: User,
      },
    ],
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
  const sections = isCitizen ? citizenSections : governmentSections;

  if (isMobileDrawer) {
    return (
      <div className="flex h-full flex-col bg-white p-5">
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(53,98,103,0.14)]">
          <div className="flex items-center gap-3">
            <img
              src="/jaldrishti_logo.png"
              alt="JalDrishti Logo"
              className="h-8 w-auto object-contain shrink-0"
            />
            <div>
              <span className="text-base font-bold text-(--color-ocean)">
                JalDrishti
              </span>
              <p className="text-[11px] text-(--color-medium-teal)">
                {isCitizen ? "Citizen Command Menu" : "Gov Command Menu"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-pale-aqua) text-(--color-dark-teal) hover:bg-(--color-aqua)"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-(--color-medium-teal)">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-(--color-ocean) text-white shadow-sm font-bold"
                            : "text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/50"
                        }`
                      }
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <aside
      className={`
        hidden lg:flex
        sticky top-0
        min-h-screen
        self-stretch
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
        {!collapsed && (
          <span className="text-xs font-black uppercase tracking-[0.24em] text-(--color-ocean)">
            Navigation
          </span>
        )}

        {/* Toggle Button */}
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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Menu Sections */}
      <div
        className={`
          flex-1
          ${collapsed ? "px-3" : "px-4"}
          overflow-y-auto
          space-y-6
          pb-6
        `}
      >
        {sections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-(--color-medium-teal)">
                {section.title}
              </p>
            )}

            <nav className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      py-2.5
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
                          : "px-3.5"
                      }
                      `
                    }
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />

                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
