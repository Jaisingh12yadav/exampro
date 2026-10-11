import { Fragment, useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchStudentResults, fetchStudents, setStudentActive } from "../services/adminService";
import { getErrorMessage } from "../services/api";

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function AdminStudents() {
  const [data, setData] = useState({ students: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    setLoading(true);
    fetchStudents({ page, limit: 20, search: query || undefined })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, query]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  const toggleActive = async (student) => {
    setError("");
    try {
      const res = await setStudentActive(student.id, !student.isActive);
      setData((prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === student.id ? { ...s, isActive: res.isActive } : s)),
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleResults = async (student) => {
    if (openId === student.id) return setOpenId(null);
    setOpenId(student.id);
    if (results[student.id]) return;
    try {
      const res = await fetchStudentResults(student.id);
      setResults((prev) => ({ ...prev, [student.id]: res.attempts }));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AdminLayout title="Students">
      {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="flex-1 rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button className="rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">Search</button>
      </form>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && data.students.length === 0 && <p className="text-slate-500">No students found.</p>}
        {data.students.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Attempts</th>
                <th>Avg %</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-800">{s.name}</td>
                    <td>{s.email}</td>
                    <td className="whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td>{s.attempts}</td>
                    <td>{s.averagePercentage}%</td>
                    <td className={s.isActive ? "text-green-600" : "text-red-600"}>
                      {s.isActive ? "Active" : "Disabled"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => toggleResults(s)} className="text-indigo-600 hover:underline mr-3">
                        {openId === s.id ? "Hide results" : "Results"}
                      </button>
                      <button onClick={() => toggleActive(s)} className="text-slate-700 hover:underline">
                        {s.isActive ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                  {openId === s.id && (
                    <tr className="border-b bg-slate-50">
                      <td colSpan={7} className="p-3">
                        {!results[s.id] && <span className="text-slate-500">Loading results...</span>}
                        {results[s.id] && results[s.id].length === 0 && (
                          <span className="text-slate-500">No submitted attempts.</span>
                        )}
                        {results[s.id] && results[s.id].length > 0 && (
                          <ul className="space-y-1">
                            {results[s.id].map((a) => (
                              <li key={a.id} className="flex flex-wrap gap-x-4">
                                <span className="font-medium">{a.test}</span>
                                <span>{formatDate(a.submittedAt)}</span>
                                <span>{a.score} / {a.maxScore} ({a.percentage}%)</span>
                                <span className={a.passed ? "text-green-600" : "text-red-600"}>
                                  {a.passed ? "Passed" : "Not passed"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {data.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-slate-500">Page {data.page} of {data.pages}</span>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}