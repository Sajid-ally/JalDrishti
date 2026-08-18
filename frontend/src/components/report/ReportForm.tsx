import { useState } from "react";
import api, { toApiError } from "../../services/api";

interface DetectionResult {
  hazard_type: string;
  severity: number;
  confidence: number;
  description: string;
}

export default function ReportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post<{
        success: boolean;
        hazard_type: string;
        severity: number;
        confidence: number;
        description: string;
      }>("/reports/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(res.data);
    } catch (err: unknown) {
      const apiErr = toApiError(err);
      setError(apiErr.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {loading ? "Analyzing image..." : "Run AI Detection"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="text-xs space-y-1 p-3 bg-teal-50 rounded-xl text-teal-950">
          <p><strong>Hazard Type:</strong> {result.hazard_type}</p>
          <p><strong>Severity:</strong> {result.severity}</p>
          <p><strong>Confidence:</strong> {Math.round(result.confidence * 100)}%</p>
          <p><strong>Description:</strong> {result.description}</p>
        </div>
      )}
    </div>
  );
}