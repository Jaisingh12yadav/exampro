import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchAdminStats } from "../services/adminService";
import { getErrorMessage } from "../services/api";

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const cards = stats
    ? [
        ["Students", stats.students],
        ["Subjects", stats.subjects],
        ["Questions", stats.questions],
        ["Tests", stats.tests],
        ["Published tests", stats.publishedTests],
        ["Submitted attempts", stats.submittedAttempts],
        ["Average score", `${stats.averagePercentage}%`],
      ]
    : [];

  return (
    <AdminLayout title="Admin dashboard">
      {error && <div className="rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {!stats && !error && <p className="text-slate-500">Loading...</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-indigo-600">{value}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}