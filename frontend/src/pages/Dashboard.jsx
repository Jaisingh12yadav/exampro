import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { fetchMyAttempts, fetchPublishedTests } from "../services/testService";
import { getErrorMessage } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchPublishedTests(), fetchMyAttempts()])
      .then(([t, a]) => {
        setTests(t);
        setAttempts(a);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const avg = attempts.length
    ? Math.round((attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) * 100) / 100
    : 0;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mb-6">Pick a mock test and start practising.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Stat label="Tests attempted" value={attempts.length} />
          <Stat label="Average score" value={`${avg}%`} />
          <Stat label="Best score" value={`${best}%`} />
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-3">Available tests</h2>

        {loading && <p className="text-slate-500">Loading...</p>}
        {error && <div className="rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
        {!loading && !error && tests.length === 0 && (
          <p className="text-slate-500">No tests available right now. Please check back later.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test._id} className="bg-white rounded-xl shadow p-5 flex flex-col">
              <h3 className="font-semibold text-slate-800">{test.title}</h3>
              {test.description && <p className="text-sm text-slate-500 mt-1">{test.description}</p>}
              <ul className="text-sm text-slate-600 mt-3 space-y-1">
                <li>Questions: {test.questionCount}</li>
                <li>Duration: {test.durationMinutes} minutes</li>
                <li>Total marks: {test.totalMarks}</li>
                <li>Negative marking: {test.negativeMarking ? "Yes" : "No"}</li>
              </ul>
              <Link
                to={`/tests/${test._id}/instructions`}
                className="mt-4 rounded bg-indigo-600 text-white text-center py-2 font-medium hover:bg-indigo-700"
              >
                View and start
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-indigo-600">{value}</p>
    </div>
  );
}