import type { ReactNode } from "react";

export type CardVariant = "default" | "glass" | "stat" | "news" | "hazard";

export type CardProps = {
  children?: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  /** Visual variant: default | glass | stat | news | hazard */
  variant?: CardVariant;
};

export default function Card({
  children,
  className = "",
  title,
  subtitle,
  value,
  variant = "default",
}: CardProps) {
  const variantClass = variant !== "default" ? `card-${variant}` : "";

  return (
    <div
      className={`rounded-[28px] border border-white/50 bg-white/45 p-6 shadow-[0_8px_30px_rgba(53,98,103,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/55 hover:shadow-[0_12px_35px_rgba(53,98,103,0.18)] ${variantClass} ${className}`}
    >
      {title && (
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#356267]">
          {title}
        </p>
      )}

      {value && (
        <h2 className="mt-4 text-4xl font-black text-[#07545c]">{value}</h2>
      )}

      {subtitle && (
        <p className="mt-3 text-sm text-[#41737c]">{subtitle}</p>
      )}

      {children}
    </div>
  );
}



export function DashboardCards({
  activeAlerts = 4,
  openReports = 12,
  rescueRequests = 2,
}: {
  activeAlerts?: number;
  openReports?: number;
  rescueRequests?: number;
} = {}) {
  const cards = [
    {
      title: "Active alerts",
      value: activeAlerts,
      subtitle: "Across monitored zones",
    },
    {
      title: "Open reports",
      value: openReports,
      subtitle: "Awaiting action",
    },
    {
      title: "Rescue requests",
      value: rescueRequests,
      subtitle: "In progress",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {cards.map((c) => (
        <Card
          key={String(c.title)}
          title={c.title}
          value={c.value}
          subtitle={c.subtitle}
        />
      ))}
    </div>
  );
}
