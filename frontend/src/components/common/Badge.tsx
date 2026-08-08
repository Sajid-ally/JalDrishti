import type { ReactNode } from "react";

type BadgeVariant =
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
}

export default function Badge({
    children,
    variant = "neutral",
}: BadgeProps) {
    return (
        <span className={`badge badge-${variant}`}>
            {children}
        </span>
    );
}