import api from "./api";

export const fetchPublishedTests = async () => {
  const { data } = await api.get("/tests");
  return data.data.tests;
};

export const fetchPublishedTest = async (id) => {
  const { data } = await api.get(`/tests/${id}`);
  return data.data.test;
};

export const fetchMyAttempts = async () => {
  const { data } = await api.get("/attempts/my");
  return data.data.attempts;
};