import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { submitReport } from "./services/reportService";
import { flushQueue } from "./utils/offlineQueue";

function App() {
  useEffect(() => {
    const syncOfflineReports = async () => {
      if (!navigator.onLine) return;

      try {
        await flushQueue(async (item) => {
          const draft = {
            type: item.draft.type ?? "other",
            description: item.draft.description ?? "",
            location: item.draft.location ?? { lat: 0, lng: 0 },
            severity: item.draft.severity ?? "moderate",
            mediaFile: null,
          };
          const res = await submitReport(draft);
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