import {
    FiMapPin,
    FiCalendar,
    FiArrowRight,
} from "react-icons/fi";

import type { Report } from "../../types/report.types";
import {
    formatDate,
    getPriorityLabel,
    getStatusLabel,
} from "../../utils/helpers";

import Badge from "../common/Badge";
import Button from "../common/Button";

interface ReportCardProps {
    report: Report;
    onView?: (reportId: string) => void;
}

export default function ReportCard({
    report,
    onView,
}: ReportCardProps) {
    const getStatusVariant = () => {
        switch (report.status) {
            case "resolved":
                return "success" as const;

            case "rejected":
                return "danger" as const;

            case "pending":
            case "under_review":
                return "warning" as const;

            case "in_progress":
                return "info" as const;

            default:
                return "neutral" as const;
        }
    };

    const getPriorityVariant = () => {
        switch (report.priority) {
            case "critical":
            case "high":
                return "danger" as const;

            case "medium":
                return "warning" as const;

            case "low":
                return "success" as const;

            default:
                return "neutral" as const;
        }
    };

    return (
        <article className="report-card">
            {report.imageUrl && (
                <div className="report-card-image">
                    <img
                        src={report.imageUrl}
                        alt={report.title}
                    />
                </div>
            )}

            <div className="report-card-content">
                <div className="report-card-top">
                    <span className="report-category">
                        {report.category}
                    </span>

                    <Badge variant={getStatusVariant()}>
                        {getStatusLabel(report.status)}
                    </Badge>
                </div>

                <h3 className="report-card-title">
                    {report.title}
                </h3>

                <p className="report-card-description">
                    {report.description}
                </p>

                <div className="report-card-meta">
                    <span>
                        <FiMapPin size={15} />
                        {report.location}
                    </span>

                    <span>
                        <FiCalendar size={15} />
                        {formatDate(report.createdAt)}
                    </span>
                </div>

                <div className="report-card-footer">
                    <Badge variant={getPriorityVariant()}>
                        {getPriorityLabel(report.priority)}
                    </Badge>

                    <Button
                        variant="ghost"
                        onClick={() => onView?.(report.id)}
                    >
                        View Details
                        <FiArrowRight size={16} />
                    </Button>
                </div>
            </div>
        </article>
    );
}