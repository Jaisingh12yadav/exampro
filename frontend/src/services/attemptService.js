import api from "./api";

export const startAttempt = async (testId) => {
  const { data } = await api.post("/attempts/start", { testId });
  return data.data;
};

export const saveAnswer = async (attemptId, payload) => {
  const { data } = await api.put(`/attempts/${attemptId}/answers`, payload);
  return data;
};

export const submitAttempt = async (attemptId) => {
  const { data } = await api.post(`/attempts/${attemptId}/submit`);
  return data.data.result;
};

export const fetchResult = async (attemptId) => {
  const { data } = await api.get(`/attempts/${attemptId}/result`);
  return data.data;
};