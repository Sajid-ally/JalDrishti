import { useState } from "react";
import { ShieldCheck, CheckSquare, XCircle, Trash2, Send } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { MOCK_HAZARD_REPORTS } from "../../services/hazardService";
import Badge from "../../components/common/Badge";

// Simple table view for reports (desktop) and stacked cards (mobile)
export default function ReviewReports() {
  useAuth();
  const [reports] = useState(MOCK_HAZARD_REPORTS);

  return (
    <section className="p-4">
      <h1 className="text-2xl font-black mb-4 text-(--color-deep-ocean)">Review Reports</h1>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border border-[rgba(53,98,103,0.1)] rounded-lg">
          <thead className="bg-(--color-soft-mint)">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Severity</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t border-[rgba(53,98,103,0.05)]">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2 text-capitalize">{r.severity}</td>
                <td className="px-4 py-2"><Badge variant="info">{r.status}</Badge></td>
                <td className="px-4 py-2 space-x-2">
                  <button className="px-2 py-1 text-sm bg-(--color-ocean) text-white rounded">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {reports.map((r) => (
          <div key={r.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{r.id}</span>
              <Badge variant="info">{r.status}</Badge>
            </div>
            <p className="text-sm">{r.type} – {r.severity}</p>
            <button className="mt-2 w-full text-center px-3 py-1 bg-(--color-ocean) text-white rounded">View</button>
          </div>
        ))}
      </div>
    </section>
  );
}
