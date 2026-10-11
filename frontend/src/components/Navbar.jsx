import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="text-xl font-bold text-indigo-600">
          ExamPro
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          {user?.role === "student" && (
            <>
              <Link to="/dashboard" className="text-slate-600 hover:text-indigo-600">Tests</Link>
              <Link to="/history" className="text-slate-600 hover:text-indigo-600">History</Link>
            </>
          )}
          <span className="hidden sm:inline text-slate-500">{user?.name}</span>
          <button onClick={handleLogout} className="rounded bg-slate-800 text-white px-3 py-1.5 hover:bg-slate-900">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}