import { useState } from "react";
import type { Report } from "../types/report.types";

export default function useReports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Backend API will be connected here later.
            // For now, we simply return an empty list.

            setReports([]);
        } catch {
            setError("Unable to load reports.");
        } finally {
            setIsLoading(false);
        }
    };

    const getReportById = (
        reportId: string
    ): Report | undefined => {
        return reports.find(
            (report) => report.id === reportId
        );
    };

    const addReport = (report: Report) => {
        setReports((currentReports) => [
            report,
            ...currentReports,
        ]);
    };

    const updateReport = (
        reportId: string,
        updatedReport: Partial<Report>
    ) => {
        setReports((currentReports) =>
            currentReports.map((report) =>
                report.id === reportId
                    ? { ...report, ...updatedReport }
                    : report
            )
        );
    };

    return {
        reports,
        isLoading,
        error,
        fetchReports,
        getReportById,
        addReport,
        updateReport,
    };
}