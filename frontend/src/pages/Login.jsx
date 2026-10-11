import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(form);
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-indigo-600 text-center">ExamPro</h1>
        <p className="text-center text-slate-500 mt-1 mb-6">Login to practice mock tests</p>

        {error && <div className="mb-4 rounded bg-red-50 text-red-700 text-sm p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-5">
          New here?{" "}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}