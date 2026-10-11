import Question from "../models/Question.js";
import Subject from "../models/Subject.js";

export const listQuestions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.topic) filter.topic = req.query.topic;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .populate("subject", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Question.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { questions, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate("subject", "name");
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.json({ success: true, data: { question } });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (req, res, next) => {
  try {
    const { text, options, correctAnswer, subject, topic, difficulty, marks, negativeMarks, explanation } =
      req.body;

    const subjectExists = await Subject.exists({ _id: subject });
    if (!subjectExists) {
      return res.status(400).json({ success: false, message: "Subject does not exist" });
    }

    const question = await Question.create({
      text,
      options,
      correctAnswer,
      subject,
      topic,
      difficulty,
      marks,
      negativeMarks,
      explanation,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Question created", data: { question } });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req, res, next) => {
  try {
    const allowed = [
      "text",
      "options",
      "correctAnswer",
      "subject",
      "topic",
      "difficulty",
      "marks",
      "negativeMarks",
      "explanation",
    ];
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    if (req.body.subject) {
      const subjectExists = await Subject.exists({ _id: req.body.subject });
      if (!subjectExists) {
        return res.status(400).json({ success: false, message: "Subject does not exist" });
      }
    }

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) question[key] = req.body[key];
    });
    await question.save();
    res.json({ success: true, message: "Question updated", data: { question } });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.json({ success: true, message: "Question deleted" });
  } catch (error) {
    next(error);
  }
};