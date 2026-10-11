import mongoose from "mongoose";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";

const uniqueIds = (ids) => [...new Set(ids.map(String))];

const sumMarks = async (questionIds) => {
  if (!questionIds.length) return 0;
  const result = await Question.aggregate([
    { $match: { _id: { $in: questionIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: null, total: { $sum: "$marks" } } },
  ]);
  return result.length ? result[0].total : 0;
};

const checkDistribution = async (distribution) => {
  const ids = distribution.map((d) => String(d.subject));
  if (new Set(ids).size !== ids.length) return "Same subject added twice in distribution";
  const found = await Subject.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) return "One or more subjects in distribution do not exist";
  return null;
};

const checkQuestions = async (questionIds) => {
  const found = await Question.countDocuments({ _id: { $in: questionIds } });
  if (found !== questionIds.length) return "One or more questions do not exist";
  return null;
};

const studentView = (test) => {
  const obj = test.toObject ? test.toObject() : test;
  const { questions, ...rest } = obj;
  return { ...rest, questionCount: (questions || []).length };
};

// ---------- Admin ----------

export const adminListTests = async (req, res, next) => {
  try {
    const tests = await Test.find()
      .populate("distribution.subject", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { tests: tests.map(studentView) } });
  } catch (error) {
    next(error);
  }
};

export const adminGetTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate("distribution.subject", "name")
      .populate({ path: "questions", populate: { path: "subject", select: "name" } });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    res.json({ success: true, data: { test } });
  } catch (error) {
    next(error);
  }
};

export const createTest = async (req, res, next) => {
  try {
    const { title, description, durationMinutes, passingMarks, negativeMarking } = req.body;
    const distribution = req.body.distribution || [];
    const questions = uniqueIds(req.body.questions || []);

    const distError = await checkDistribution(distribution);
    if (distError) return res.status(400).json({ success: false, message: distError });

    const qError = await checkQuestions(questions);
    if (qError) return res.status(400).json({ success: false, message: qError });

    const totalMarks = await sumMarks(questions);
    if ((passingMarks || 0) > totalMarks && questions.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Passing marks cannot be more than total marks" });
    }

    const test = await Test.create({
      title,
      description,
      durationMinutes,
      passingMarks,
      negativeMarking,
      distribution,
      questions,
      totalMarks,
      isPublished: false,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Test created", data: { test } });
  } catch (error) {
    next(error);
  }
};

export const updateTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const structural = ["durationMinutes", "negativeMarking", "distribution", "questions"];
    if (test.isPublished && structural.some((key) => req.body[key] !== undefined)) {
      return res.status(400).json({
        success: false,
        message: "Unpublish the test before changing duration, marking, distribution or questions",
      });
    }

    ["title", "description", "durationMinutes", "passingMarks", "negativeMarking"].forEach((key) => {
      if (req.body[key] !== undefined) test[key] = req.body[key];
    });

    if (req.body.distribution !== undefined) {
      const distError = await checkDistribution(req.body.distribution);
      if (distError) return res.status(400).json({ success: false, message: distError });
      test.distribution = req.body.distribution;
    }

    if (req.body.questions !== undefined) {
      const questions = uniqueIds(req.body.questions);
      const qError = await checkQuestions(questions);
      if (qError) return res.status(400).json({ success: false, message: qError });
      test.questions = questions;
      test.totalMarks = await sumMarks(questions);
    }

    if (test.questions.length > 0 && test.passingMarks > test.totalMarks) {
      return res
        .status(400)
        .json({ success: false, message: "Passing marks cannot be more than total marks" });
    }

    await test.save();
    res.json({ success: true, message: "Test updated", data: { test } });
  } catch (error) {
    next(error);
  }
};

export const autoFillTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    if (test.isPublished) {
      return res
        .status(400)
        .json({ success: false, message: "Unpublish the test before changing questions" });
    }
    if (!test.distribution.length) {
      return res
        .status(400)
        .json({ success: false, message: "Set the subject distribution first" });
    }

    const picked = [];
    for (const item of test.distribution) {
      const sample = await Question.aggregate([
        { $match: { subject: new mongoose.Types.ObjectId(item.subject) } },
        { $sample: { size: item.count } },
        { $project: { _id: 1 } },
      ]);
      if (sample.length < item.count) {
        const subject = await Subject.findById(item.subject).select("name");
        return res.status(400).json({
          success: false,
          message: `Not enough questions in "${subject ? subject.name : "subject"}": need ${item.count}, found ${sample.length}`,
        });
      }
      sample.forEach((q) => picked.push(String(q._id)));
    }

    test.questions = picked;
    test.totalMarks = await sumMarks(picked);
    await test.save();
    res.json({
      success: true,
      message: "Questions added to test",
      data: { questionCount: picked.length, totalMarks: test.totalMarks },
    });
  } catch (error) {
    next(error);
  }
};

export const togglePublish = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    if (!test.isPublished) {
      if (!test.questions.length) {
        return res.status(400).json({ success: false, message: "Add questions before publishing" });
      }
      if (test.passingMarks > test.totalMarks) {
        return res
          .status(400)
          .json({ success: false, message: "Passing marks cannot be more than total marks" });
      }
      if (test.distribution.length) {
        const qs = await Question.find({ _id: { $in: test.questions } }).select("subject");
        for (const item of test.distribution) {
          const have = qs.filter((q) => String(q.subject) === String(item.subject)).length;
          if (have !== item.count) {
            return res.status(400).json({
              success: false,
              message: "Questions do not match the subject distribution. Use auto-fill or fix questions.",
            });
          }
        }
      }
    }

    test.isPublished = !test.isPublished;
    await test.save();
    res.json({
      success: true,
      message: test.isPublished ? "Test published" : "Test unpublished",
      data: { isPublished: test.isPublished },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (req, res, next) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    res.json({ success: true, message: "Test deleted" });
  } catch (error) {
    next(error);
  }
};

// ---------- Student (never returns questions or answers) ----------

export const listPublishedTests = async (req, res, next) => {
  try {
    const tests = await Test.find({ isPublished: true })
      .populate("distribution.subject", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { tests: tests.map(studentView) } });
  } catch (error) {
    next(error);
  }
};

export const getPublishedTest = async (req, res, next) => {
  try {
    const test = await Test.findOne({ _id: req.params.id, isPublished: true }).populate(
      "distribution.subject",
      "name"
    );
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    res.json({ success: true, data: { test: studentView(test) } });
  } catch (error) {
    next(error);
  }
};