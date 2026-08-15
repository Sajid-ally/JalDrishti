import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { submitReport } from "./services/reportService";
import { flushQueue } from "./utils/offlineQueue";
import type { HazardReportDraft } from "./types/hazard";
function App() {
  useEffect(() => {
    const syncOfflineReports = async () => {
      if (!navigator.onLine) return;

      try {
        await flushQueue(async (item) => {
     const res = await submitReport(item.draft as unknown as HazardReportDraft);
  return res.success;
        });
        console.log("✅ Offline reports synchronized.");
      } catch (err) {
        console.error("❌ Failed to sync offline reports:", err);
      }
    };

    // Sync immediately if online
    syncOfflineReports();

    // Sync whenever internet comes back
    window.addEventListener("online", syncOfflineReports);

    return () => {
      window.removeEventListener("online", syncOfflineReports);
    };
  }, []);

  return <AppRoutes />;
}

export default App;