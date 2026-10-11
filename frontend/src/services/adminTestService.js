import api from "./api";

export const fetchAdminTests = async () => {
  const { data } = await api.get("/tests/admin/all");
  return data.data.tests;
};

export const createTest = async (payload) => {
  const { data } = await api.post("/tests", payload);
  return data.data.test;
};

export const updateTest = async (id, payload) => {
  const { data } = await api.put(`/tests/${id}`, payload);
  return data.data.test;
};

export const autoFillTest = async (id) => {
  const { data } = await api.post(`/tests/${id}/auto-fill`);
  return data;
};

export const togglePublishTest = async (id) => {
  const { data } = await api.patch(`/tests/${id}/publish`);
  return data;
};

export const deleteTest = async (id) => {
  const { data } = await api.delete(`/tests/${id}`);
  return data;
};

export const fetchTestStats = async (id) => {
  const { data } = await api.get(`/admin/tests/${id}/stats`);
  return data.data;
};