import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  createSubject,
  deleteSubject,
  fetchSubjects,
  updateSubject,
} from "../services/adminService";
import { getErrorMessage } from "../services/api";

const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchSubjects()
      .then(setSubjects)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (form.name.trim().length < 2) return setError("Subject name must be at least 2 characters");

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (editingId) {
        await updateSubject(editingId, payload);
        setMessage("Subject updated");
      } else {
        await createSubject(payload);
        setMessage("Subject created");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (subject) => {
    setEditingId(subject._id);
    setForm({ name: subject.name, description: subject.description || "" });
    setError("");
    setMessage("");
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete subject "${subject.name}"?`)) return;
    setError("");
    setMessage("");
    try {
      await deleteSubject(subject._id);
      setMessage("Subject deleted");
      if (editingId === subject._id) resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AdminLayout title="Subjects">
      {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-50 text-green-700 text-sm p-3">{message}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Logical Reasoning"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
          <input
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update subject" : "Add subject"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && subjects.length === 0 && <p className="text-slate-500">No subjects yet.</p>}
        {subjects.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Name</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s._id} className="border-b last:border-0">
                  <td className="py-2 font-medium text-slate-800">{s.name}</td>
                  <td className="text-slate-600">{s.description || "-"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => startEdit(s)} className="text-indigo-600 hover:underline mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}