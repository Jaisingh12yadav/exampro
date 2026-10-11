import Subject from "../models/Subject.js";
import Question from "../models/Question.js";

export const listSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json({ success: true, data: { subjects } });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const exists = await Subject.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (exists) {
      return res.status(409).json({ success: false, message: "Subject already exists" });
    }
    const subject = await Subject.create({ name, description });
    res.status(201).json({ success: true, message: "Subject created", data: { subject } });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    if (name !== undefined) subject.name = name;
    if (description !== undefined) subject.description = description;
    await subject.save();
    res.json({ success: true, message: "Subject updated", data: { subject } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Subject name already used" });
    }
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const inUse = await Question.exists({ subject: req.params.id });
    if (inUse) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete: subject has questions" });
    }
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    res.json({ success: true, message: "Subject deleted" });
  } catch (error) {
    next(error);
  }
};