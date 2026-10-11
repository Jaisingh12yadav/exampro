import api from "./api";

export const fetchQuestions = async (params = {}) => {
  const { data } = await api.get("/questions", { params });
  return data.data;
};

export const createQuestion = async (payload) => {
  const { data } = await api.post("/questions", payload);
  return data.data.question;
};

export const updateQuestion = async (id, payload) => {
  const { data } = await api.put(`/questions/${id}`, payload);
  return data.data.question;
};

export const deleteQuestion = async (id) => {
  const { data } = await api.delete(`/questions/${id}`);
  return data;
};

const uploadForm = (file, extra = {}) => {
  const form = new FormData();
  Object.entries(extra).forEach(([key, value]) => form.append(key, value));
  form.append("file", file); // text fields first, file last
  return form;
};

export const previewImport = async (file) => {
  const { data } = await api.post("/import/preview", uploadForm(file));
  return data.data;
};

export const confirmImport = async (file, createMissingSubjects) => {
  const { data } = await api.post(
    "/import/confirm",
    uploadForm(file, { createMissingSubjects: String(createMissingSubjects) })
  );
  return data;
};