import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/citizen/track-report?id=${id}`, { replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
      Redirecting to Track Your Reports…
    </div>
  );
}
