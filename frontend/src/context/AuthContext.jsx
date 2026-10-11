import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, loginUser, registerUser } from "../services/authService";

const AuthContext = createContext(null);

const saveSession = ({ user, token }) => {
  localStorage.setItem("exampro_token", token);
  localStorage.setItem("exampro_user", JSON.stringify(user));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("exampro_user"));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("exampro_token")));

  useEffect(() => {
    const token = localStorage.getItem("exampro_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((me) => setUser(me))
      .catch(() => {
        localStorage.removeItem("exampro_token");
        localStorage.removeItem("exampro_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const data = await loginUser(credentials);
    saveSession(data);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    saveSession(data);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("exampro_token");
    localStorage.removeItem("exampro_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};