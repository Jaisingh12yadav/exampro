import { NavLink } from "react-router-dom";
import Navbar from "./Navbar";

// more links are added here in later phases
const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/tests", label: "Tests" },
  { to: "/admin/subjects", label: "Subjects" },
  { to: "/admin/questions", label: "Questions" },
  { to: "/admin/import", label: "Import" },
  { to: "/admin/students", label: "Students" },
];

export default function AdminLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <nav className="bg-white border-t border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 py-2 text-sm whitespace-nowrap border-b-2 ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 font-medium"
                    : "border-transparent text-slate-600 hover:text-indigo-600"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-5">{title}</h1>
        {children}
      </main>
    </div>
  );
}