import mongoose from "mongoose";
import User from "../models/User.js";
import Test from "../models/Test.js";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import Attempt from "../models/Attempt.js";

export const getStats = async (req, res, next) => {
  try {
    const [students, tests, publishedTests, questions, subjects, attempts, avg] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Test.countDocuments(),
      Test.countDocuments({ isPublished: true }),
      Question.countDocuments(),
      Subject.countDocuments(),
      Attempt.countDocuments({ status: "submitted" }),
      Attempt.aggregate([
        { $match: { status: "submitted" } },
        { $group: { _id: null, avgPercentage: { $avg: "$percentage" } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        students,
        tests,
        publishedTests,
        questions,
        subjects,
        submittedAttempts: attempts,
        averagePercentage: avg.length ? Math.round(avg[0].avgPercentage * 100) / 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listStudents = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const filter = { role: "student" };

    if (req.query.search) {
      const safe = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: new RegExp(safe, "i") },
        { email: new RegExp(safe, "i") },
      ];
    }

    const [students, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    const ids = students.map((s) => s._id);
    const counts = await Attempt.aggregate([
      { $match: { user: { $in: ids }, status: "submitted" } },
      { $group: { _id: "$user", attempts: { $sum: 1 }, avg: { $avg: "$percentage" } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c]));

    res.json({
      success: true,
      data: {
        students: students.map((s) => {
          const c = countMap.get(String(s._id));
          return {
            id: s._id,
            name: s.name,
            email: s.email,
            isActive: s.isActive,
            createdAt: s.createdAt,
            attempts: c ? c.attempts : 0,
            averagePercentage: c ? Math.round(c.avg * 100) / 100 : 0,
          };
        }),
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const setStudentActive = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: "student" });
    if (!user) return res.status(404).json({ success: false, message: "Student not found" });
    user.isActive = Boolean(req.body.isActive);
    await user.save();
    res.json({
      success: true,
      message: user.isActive ? "Student enabled" : "Student disabled",
      data: { isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

export const studentResults = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const attempts = await Attempt.find({ user: student._id, status: "submitted" })
      .populate("test", "title")
      .sort({ submittedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: {
        student: { id: student._id, name: student.name, email: student.email },
        attempts: attempts.map((a) => ({
          id: a._id,
          test: a.test ? a.test.title : "Deleted test",
          submittedAt: a.submittedAt,
          score: a.score,
          maxScore: a.maxScore,
          percentage: a.percentage,
          passed: a.passed,
          autoSubmitted: a.autoSubmitted,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const testStats = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).select("title totalMarks passingMarks");
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const [summary] = await Attempt.aggregate([
      { $match: { test: new mongoose.Types.ObjectId(req.params.id), status: "submitted" } },
      {
        $group: {
          _id: null,
          attempts: { $sum: 1 },
          students: { $addToSet: "$user" },
          avgPercentage: { $avg: "$percentage" },
          highest: { $max: "$percentage" },
          lowest: { $min: "$percentage" },
          passed: { $sum: { $cond: ["$passed", 1, 0] } },
        },
      },
    ]);

    const subjectStats = await Attempt.aggregate([
      { $match: { test: new mongoose.Types.ObjectId(req.params.id), status: "submitted" } },
      { $unwind: "$subjectStats" },
      {
        $group: {
          _id: "$subjectStats.name",
          score: { $sum: "$subjectStats.score" },
          maxScore: { $sum: "$subjectStats.maxScore" },
        },
      },
    ]);

    const round = (n) => Math.round(n * 100) / 100;

    res.json({
      success: true,
      data: {
        test: { id: test._id, title: test.title },
        attempts: summary ? summary.attempts : 0,
        uniqueStudents: summary ? summary.students.length : 0,
        averagePercentage: summary ? round(summary.avgPercentage) : 0,
        highestPercentage: summary ? round(summary.highest) : 0,
        lowestPercentage: summary ? round(summary.lowest) : 0,
        passCount: summary ? summary.passed : 0,
        subjects: subjectStats.map((s) => ({
          subject: s._id,
          averagePercentage: s.maxScore > 0 ? round(Math.max(0, (s.score / s.maxScore) * 100)) : 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};