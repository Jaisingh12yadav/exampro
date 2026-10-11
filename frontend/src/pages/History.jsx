import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar from "../components/Navbar";
import { fetchMyAttempts } from "../services/testService";
import { getErrorMessage } from "../services/api";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

export default function History() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyAttempts()
      .then(setAttempts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // oldest first, so the line chart reads left to right
  const trend = useMemo(
    () =>
      [...attempts]
        .reverse()
        .map((a, i) => ({
          name: `#${i + 1}`,
          percentage: a.percentage,
          test: a.test?.title || "Deleted test",
        })),
    [attempts]
  );

  // average percentage per subject across all attempts
  const subjectData = useMemo(() => {
    const map = new Map();
    attempts.forEach((a) => {
      (a.subjectStats || []).forEach((s) => {
        const cur = map.get(s.name) || { name: s.name, score: 0, maxScore: 0 };
        cur.score += s.score;
        cur.maxScore += s.maxScore;
        map.set(s.name, cur);
      });
    });
    return [...map.values()].map((s) => ({
      name: s.name,
      percentage: s.maxScore > 0 ? Math.max(0, Math.round((s.score / s.maxScore) * 10000) / 100) : 0,
    }));
  }, [attempts]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-800">My results</h1>
        <p className="text-slate-500 mb-6">Track your progress across all attempts.</p>

        {loading && <p className="text-slate-500">Loading...</p>}
        {error && <div className="rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}

        {!loading && !error && attempts.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-slate-600">
            You have not submitted any test yet.{" "}
            <Link to="/dashboard" className="text-indigo-600 font-medium">Start a test</Link>
          </div>
        )}

        {attempts.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-slate-800 mb-3">Score trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l, p) => p?.[0]?.payload?.test || l} />
                      <Line type="monotone" dataKey="percentage" name="Score" stroke="#4f46e5" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-slate-800 mb-3">Subject-wise average</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Legend />
                      <Bar dataKey="percentage" name="Average %" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <h2 className="font-semibold text-slate-800 mb-3">All attempts</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Test</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-800">{a.test?.title || "Deleted test"}</td>
                      <td className="whitespace-nowrap">{formatDate(a.submittedAt)}</td>
                      <td className="whitespace-nowrap">{a.score} / {a.maxScore}</td>
                      <td>{a.percentage}%</td>
                      <td>
                        <span className={a.passed ? "text-green-600" : "text-red-600"}>
                          {a.passed ? "Passed" : "Not passed"}
                        </span>
                        {a.autoSubmitted && <span className="text-xs text-slate-500"> (auto)</span>}
                      </td>
                      <td>
                        <Link to={`/results/${a.id}`} className="text-indigo-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}