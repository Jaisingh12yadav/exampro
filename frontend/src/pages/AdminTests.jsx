import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchSubjects } from "../services/adminService";
import {
  autoFillTest,
  createTest,
  deleteTest,
  fetchAdminTests,
  fetchTestStats,
  togglePublishTest,
  updateTest,
} from "../services/adminTestService";
import { getErrorMessage } from "../services/api";

const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const emptyForm = {
  title: "",
  description: "",
  durationMinutes: 90,
  passingMarks: 0,
  negativeMarking: true,
  distribution: [{ subject: "", count: 1 }],
};

export default function AdminTests() {
  const [subjects, setSubjects] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // the test being edited
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statsFor, setStatsFor] = useState(null);
  const [stats, setStats] = useState(null);

  const load = () =>
    fetchAdminTests()
      .then(setTests)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchSubjects().then(setSubjects).catch((err) => setError(getErrorMessage(err)));
    load();
  }, []);

  const locked = Boolean(editing?.isPublished); // published tests: structure cannot change

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, distribution: [{ subject: subjects[0]?._id || "", count: 1 }] });
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEdit = (test) => {
    setEditing(test);
    setForm({
      title: test.title,
      description: test.description || "",
      durationMinutes: test.durationMinutes,
      passingMarks: test.passingMarks,
      negativeMarking: test.negativeMarking,
      distribution: test.distribution.length
        ? test.distribution.map((d) => ({ subject: d.subject?._id || d.subject, count: d.count }))
        : [{ subject: subjects[0]?._id || "", count: 1 }],
    });
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const setRow = (index, patch) =>
    setForm((prev) => ({
      ...prev,
      distribution: prev.distribution.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  const addRow = () =>
    setForm((prev) => ({ ...prev, distribution: [...prev.distribution, { subject: "", count: 1 }] }));
  const removeRow = (index) =>
    setForm((prev) => ({ ...prev, distribution: prev.distribution.filter((_, i) => i !== index) }));

  const totalQuestions = form.distribution.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.title.trim().length < 3) return setError("Title must be at least 3 characters");
    if (!Number.isInteger(Number(form.durationMinutes)) || form.durationMinutes < 1 || form.durationMinutes > 600) {
      return setError("Duration must be a whole number between 1 and 600 minutes");
    }
    if (Number(form.passingMarks) < 0) return setError("Passing marks cannot be negative");

    const distribution = form.distribution.map((r) => ({ subject: r.subject, count: Number(r.count) }));
    if (!locked) {
      if (!distribution.length) return setError("Add at least one subject to the distribution");
      if (distribution.some((r) => !r.subject)) return setError("Select a subject in every distribution row");
      if (distribution.some((r) => !Number.isInteger(r.count) || r.count < 1)) {
        return setError("Each count must be a whole number, 1 or more");
      }
      if (new Set(distribution.map((r) => r.subject)).size !== distribution.length) {
        return setError("The same subject is added twice");
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      passingMarks: Number(form.passingMarks),
    };
    if (!locked) {
      payload.durationMinutes = Number(form.durationMinutes);
      payload.negativeMarking = form.negativeMarking;
      payload.distribution = distribution;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateTest(editing._id, payload);
        setMessage(
          locked
            ? "Test updated"
            : "Test updated. If you changed the distribution, click Auto-fill again to refresh the questions."
        );
      } else {
        await createTest(payload);
        setMessage("Test created. Click Auto-fill to pick questions, then Publish.");
      }
      closeForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (test, action, success) => {
    setError("");
    setMessage("");
    setBusyId(test._id);
    try {
      const res = await action(test._id);
      setMessage(success || res.message);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (test) => {
    if (!window.confirm(`Delete test "${test.title}"? Student results for it will lose the test name.`)) return;
    runAction(test, deleteTest, "Test deleted");
  };

  const toggleStats = async (test) => {
    if (statsFor === test._id) return setStatsFor(null);
    setStatsFor(test._id);
    setStats(null);
    try {
      setStats(await fetchTestStats(test._id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AdminLayout title="Tests">
      {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-50 text-green-700 text-sm p-3">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">{editing ? "Edit test" : "Create test"}</h2>
          {locked && (
            <div className="rounded bg-amber-50 text-amber-800 text-sm p-3">
              This test is published. Only title, description and passing marks can be changed. Unpublish it to
              change duration, marking or distribution.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
              <input type="number" min="1" max="600" disabled={locked} className={inputClass} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing marks</label>
              <input type="number" min="0" step="0.25" className={inputClass} value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" disabled={locked} checked={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: e.target.checked })} />
              Negative marking
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">
                Question distribution (total: {totalQuestions})
              </h3>
              {!locked && (
                <button type="button" onClick={addRow} className="text-sm text-indigo-600 hover:underline">
                  + Add subject
                </button>
              )}
            </div>
            <div className="space-y-2">
              {form.distribution.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <select disabled={locked} className={inputClass} value={row.subject} onChange={(e) => setRow(index, { subject: e.target.value })}>
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <input type="number" min="1" disabled={locked} className="w-28 rounded border border-slate-300 px-3 py-2" value={row.count} onChange={(e) => setRow(index, { count: e.target.value })} />
                  {!locked && form.distribution.length > 1 && (
                    <button type="button" onClick={() => removeRow(index)} className="text-red-600 px-2">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Example for placement mocks: Quantitative Aptitude 50 and English 30. Auto-fill randomly picks that
              many questions from each subject.
            </p>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-60">
              {saving ? "Saving..." : editing ? "Update test" : "Create test"}
            </button>
            <button type="button" onClick={closeForm} className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center mb-4">
        <span className="text-sm text-slate-500">{tests.length} tests</span>
        <button onClick={openNew} className="ml-auto rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">
          Create test
        </button>
      </div>

      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && tests.length === 0 && <p className="text-slate-500">No tests yet.</p>}

      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test._id} className="bg-white rounded-xl shadow p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800">{test.title}</h3>
                <p className="text-sm text-slate-500">
                  {test.questionCount} questions | {test.durationMinutes} min | {test.totalMarks} marks | pass{" "}
                  {test.passingMarks} | negative marking {test.negativeMarking ? "on" : "off"}
                </p>
                <p className="text-sm text-slate-500">
                  {test.distribution.length
                    ? test.distribution.map((d) => `${d.subject?.name || "?"}: ${d.count}`).join(", ")
                    : "No distribution set"}
                </p>
              </div>
              <span className={`text-xs font-semibold rounded px-2 py-1 ${test.isPublished ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}`}>
                {test.isPublished ? "Published" : "Draft"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 text-sm">
              <button disabled={busyId === test._id} onClick={() => openEdit(test)} className="text-indigo-600 hover:underline">Edit</button>
              {!test.isPublished && (
                <button disabled={busyId === test._id} onClick={() => runAction(test, autoFillTest)} className="text-indigo-600 hover:underline">
                  Auto-fill questions
                </button>
              )}
              <button disabled={busyId === test._id} onClick={() => runAction(test, togglePublishTest)} className="text-green-700 hover:underline">
                {test.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button onClick={() => toggleStats(test)} className="text-slate-700 hover:underline">
                {statsFor === test._id ? "Hide stats" : "Statistics"}
              </button>
              <button disabled={busyId === test._id} onClick={() => handleDelete(test)} className="text-red-600 hover:underline">Delete</button>
            </div>

            {statsFor === test._id && (
              <div className="mt-4 rounded bg-slate-50 p-4 text-sm">
                {!stats && <span className="text-slate-500">Loading statistics...</span>}
                {stats && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <Mini label="Attempts" value={stats.attempts} />
                      <Mini label="Students" value={stats.uniqueStudents} />
                      <Mini label="Average" value={`${stats.averagePercentage}%`} />
                      <Mini label="Highest" value={`${stats.highestPercentage}%`} />
                      <Mini label="Passed" value={stats.passCount} />
                    </div>
                    {stats.subjects.length > 0 && (
                      <ul className="mt-3 text-slate-600">
                        {stats.subjects.map((s) => (
                          <li key={s.subject}>{s.subject}: average {s.averagePercentage}%</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-indigo-600">{value}</p>
    </div>
  );
}