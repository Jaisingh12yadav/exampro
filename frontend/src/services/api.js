import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("exampro_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// expired or invalid token: clear session and go to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem("exampro_token");
      localStorage.removeItem("exampro_user");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";

export default api;