import api from "./api";

export const fetchAdminStats = async () => {
  const { data } = await api.get("/admin/stats");
  return data.data;
};

export const fetchStudents = async (params = {}) => {
  const { data } = await api.get("/admin/students", { params });
  return data.data;
};

export const setStudentActive = async (id, isActive) => {
  const { data } = await api.patch(`/admin/students/${id}/active`, { isActive });
  return data.data;
};

export const fetchStudentResults = async (id) => {
  const { data } = await api.get(`/admin/students/${id}/results`);
  return data.data;
};

export const fetchSubjects = async () => {
  const { data } = await api.get("/subjects");
  return data.data.subjects;
};

export const createSubject = async (payload) => {
  const { data } = await api.post("/subjects", payload);
  return data.data.subject;
};

export const updateSubject = async (id, payload) => {
  const { data } = await api.put(`/subjects/${id}`, payload);
  return data.data.subject;
};

export const deleteSubject = async (id) => {
  const { data } = await api.delete(`/subjects/${id}`);
  return data;
};