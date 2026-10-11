import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { fetchSubjects } from "../services/adminService";
import {
  createQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestion,
} from "../services/questionService";
import { getErrorMessage } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];
const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const emptyForm = {
  text: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  subject: "",
  topic: "General",
  difficulty: "medium",
  marks: 1,
  negativeMarks: 0,
  explanation: "",
};

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState([]);
  const [data, setData] = useState({ questions: [], total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ subject: "", difficulty: "" });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const load = () => {
    setLoading(true);
    return fetchQuestions({
      page,
      limit: 20,
      subject: filters.subject || undefined,
      difficulty: filters.difficulty || undefined,
    })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, subject: subjects[0]?._id || "" });
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEdit = (q) => {
    setEditingId(q._id);
    setForm({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      subject: q.subject?._id || "",
      topic: q.topic || "General",
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      explanation: q.explanation || "",
    });
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const setOption = (index, value) =>
    setForm((prev) => ({ ...prev, options: prev.options.map((o, i) => (i === index ? value : o)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const options = form.options.map((o) => o.trim());
    if (form.text.trim().length < 3) return setError("Question text must be at least 3 characters");
    if (options.some((o) => !o)) return setError("All 4 options are required");
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return setError("Options must all be different");
    if (!form.subject) return setError("Please select a subject");
    if (Number(form.marks) < 0 || Number(form.negativeMarks) < 0) return setError("Marks cannot be negative");

    const payload = {
      text: form.text.trim(),
      options,
      correctAnswer: Number(form.correctAnswer),
      subject: form.subject,
      topic: form.topic.trim() || "General",
      difficulty: form.difficulty,
      marks: Number(form.marks),
      negativeMarks: Number(form.negativeMarks),
      explanation: form.explanation.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateQuestion(editingId, payload);
        setMessage("Question updated");
      } else {
        await createQuestion(payload);
        setMessage("Question added");
      }
      closeForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm("Delete this question?")) return;
    setError("");
    setMessage("");
    try {
      await deleteQuestion(q._id);
      setMessage("Question deleted");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const changeFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout title="Questions">
      {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-50 text-green-700 text-sm p-3">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">{editingId ? "Edit question" : "Add question"}</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
            <textarea
              rows={3}
              className={inputClass}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {form.options.map((option, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Option {LETTERS[index]}</label>
                <input className={inputClass} value={option} onChange={(e) => setOption(index, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correct answer</label>
              <select
                className={inputClass}
                value={form.correctAnswer}
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
              >
                {LETTERS.map((l, i) => (
                  <option key={l} value={i}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                className={inputClass}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
              <input className={inputClass} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <select
                className={inputClass}
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
              <input type="number" step="0.25" min="0" className={inputClass} value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Negative marks</label>
              <input type="number" step="0.25" min="0" className={inputClass} value={form.negativeMarks} onChange={(e) => setForm({ ...form, negativeMarks: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Explanation (optional)</label>
            <textarea
              rows={2}
              className={inputClass}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update question" : "Add question"}
            </button>
            <button type="button" onClick={closeForm} className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="rounded border border-slate-300 px-3 py-2 bg-white" value={filters.subject} onChange={(e) => changeFilter("subject", e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 bg-white" value={filters.difficulty} onChange={(e) => changeFilter("difficulty", e.target.value)}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <span className="text-sm text-slate-500">{data.total} questions</span>
        <button onClick={openNew} className="ml-auto rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">
          Add question
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && data.questions.length === 0 && <p className="text-slate-500">No questions found.</p>}
        {data.questions.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Level</th>
                <th>Marks</th>
                <th>Ans</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.questions.map((q) => (
                <tr key={q._id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3 max-w-xs text-slate-800">{q.text.length > 90 ? `${q.text.slice(0, 90)}...` : q.text}</td>
                  <td>{q.subject?.name || "-"}</td>
                  <td>{q.topic}</td>
                  <td className="capitalize">{q.difficulty}</td>
                  <td>{q.marks} / -{q.negativeMarks}</td>
                  <td>{LETTERS[q.correctAnswer]}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openEdit(q)} className="text-indigo-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(q)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50">
              Previous
            </button>
            <span className="text-slate-500">Page {data.page} of {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50">
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}