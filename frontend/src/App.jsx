import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TestInstructions from "./pages/TestInstructions";
import TestAttempt from "./pages/TestAttempt";
import Result from "./pages/Result";
import History from "./pages/History";
import AdminHome from "./pages/AdminHome";
import AdminSubjects from "./pages/AdminSubjects";
import AdminStudents from "./pages/AdminStudents";
import AdminQuestions from "./pages/AdminQuestions";
import AdminImport from "./pages/AdminImport";
import AdminTests from "./pages/AdminTests";

const student = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
const admin = (element) => <ProtectedRoute adminOnly>{element}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={student(<Dashboard />)} />
          <Route path="/tests/:id/instructions" element={student(<TestInstructions />)} />
          <Route path="/tests/:id/attempt" element={student(<TestAttempt />)} />
          <Route path="/results/:id" element={student(<Result />)} />
          <Route path="/history" element={student(<History />)} />

          <Route path="/admin" element={admin(<AdminHome />)} />
          <Route path="/admin/subjects" element={admin(<AdminSubjects />)} />
          <Route path="/admin/students" element={admin(<AdminStudents />)} />
                    <Route path="/admin/questions" element={admin(<AdminQuestions />)} />
          <Route path="/admin/import" element={admin(<AdminImport />)} />
                    <Route path="/admin/tests" element={admin(<AdminTests />)} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}