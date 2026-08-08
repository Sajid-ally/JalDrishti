import {
    FiCheckCircle,
    FiClock,
    FiFileText,
} from "react-icons/fi";

import type {
    ReportStatus,
    ReportTimelineItem,
} from "../../types/report.types";

import { formatDateTime } from "../../utils/helpers";

interface ReportTimelineProps {
    items: ReportTimelineItem[];
}

export default function ReportTimeline({
    items,
}: ReportTimelineProps) {
    const getIcon = (status: ReportStatus) => {
        switch (status) {
            case "resolved":
                return <FiCheckCircle size={18} />;

            case "pending":
            case "under_review":
                return <FiClock size={18} />;

            default:
                return <FiFileText size={18} />;
        }
    };

    if (items.length === 0) {
        return (
            <div className="timeline-empty">
                <p>No updates available yet.</p>
            </div>
        );
    }

    return (
        <div className="report-timeline">
            {items.map((item, index) => (
                <div
                    className="timeline-item"
                    key={item.id}
                >
                    <div className="timeline-marker">
                        {getIcon(item.status)}
                    </div>

                    {index < items.length - 1 && (
                        <div className="timeline-line" />
                    )}

                    <div className="timeline-content">
                        <div className="timeline-header">
                            <h4>{item.title}</h4>

                            <span>
                                {formatDateTime(item.timestamp)}
                            </span>
                        </div>

                        <p>{item.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}