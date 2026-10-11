import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");

    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email, password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-indigo-600 text-center">ExamPro</h1>
        <p className="text-center text-slate-500 mt-1 mb-6">Create your student account</p>

        {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input name="name" value={form.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}