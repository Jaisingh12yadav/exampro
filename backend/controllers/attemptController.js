import mongoose from "mongoose";
import Attempt from "../models/Attempt.js";
import Test from "../models/Test.js";
import Question from "../models/Question.js";

const GRACE_MS = 5000; // small allowance for network delay when saving answers

// ---------- helpers ----------

const finalizeAttempt = async (attemptId, autoSubmitted = false) => {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt || attempt.status === "submitted") return attempt;

  const test = await Test.findById(attempt.test).select("negativeMarking passingMarks");
  const negativeMarking = test ? test.negativeMarking : false;
  const passingMarks = test ? test.passingMarks : 0;

  const questions = await Question.find({ _id: { $in: attempt.questions } }).populate(
    "subject",
    "name"
  );
  const qMap = new Map(questions.map((q) => [String(q._id), q]));
  const answerMap = new Map(attempt.answers.map((a) => [String(a.question), a]));

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const stats = new Map();

  for (const qid of attempt.questions) {
    const q = qMap.get(String(qid));
    if (!q) continue;
    const answer = answerMap.get(String(qid));
    const selected = answer ? answer.selected : null;

    const key = q.subject ? String(q.subject._id) : "none";
    if (!stats.has(key)) {
      stats.set(key, {
        subject: q.subject ? q.subject._id : undefined,
        name: q.subject ? q.subject.name : "Unknown",
        total: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        score: 0,
        maxScore: 0,
      });
    }
    const st = stats.get(key);
    st.total += 1;
    st.maxScore += q.marks;
    maxScore += q.marks;

    if (selected === null || selected === undefined) {
      unattemptedCount += 1;
      st.unattempted += 1;
    } else if (selected === q.correctAnswer) {
      correctCount += 1;
      st.correct += 1;
      st.score += q.marks;
      score += q.marks;
    } else {
      wrongCount += 1;
      st.wrong += 1;
      if (negativeMarking) {
        st.score -= q.negativeMarks;
        score -= q.negativeMarks;
      }
    }
  }

  const round = (n) => Math.round(n * 100) / 100;
  score = round(score);
  const percentage = maxScore > 0 ? Math.max(0, round((score / maxScore) * 100)) : 0;

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: "in_progress" }, // blocks double submission
    {
      $set: {
        status: "submitted",
        submittedAt: new Date(),
        autoSubmitted,
        score,
        maxScore: round(maxScore),
        percentage,
        correctCount,
        wrongCount,
        unattemptedCount,
        passed: score >= passingMarks,
        subjectStats: [...stats.values()].map((s) => ({
          ...s,
          score: round(s.score),
          maxScore: round(s.maxScore),
        })),
      },
    },
    { new: true }
  );

  return updated || (await Attempt.findById(attemptId));
};

const resultSummary = (a) => ({
  id: a._id,
  test: a.test,
  status: a.status,
  startedAt: a.startedAt,
  submittedAt: a.submittedAt,
  autoSubmitted: a.autoSubmitted,
  score: a.score,
  maxScore: a.maxScore,
  percentage: a.percentage,
  correctCount: a.correctCount,
  wrongCount: a.wrongCount,
  unattemptedCount: a.unattemptedCount,
  passed: a.passed,
  subjectStats: a.subjectStats,
});

// questions WITHOUT correct answer or explanation
const buildQuestionPayload = async (attempt) => {
  const questions = await Question.find({ _id: { $in: attempt.questions } })
    .select("text options subject topic difficulty marks negativeMarks")
    .populate("subject", "name");
  const qMap = new Map(questions.map((q) => [String(q._id), q]));
  return attempt.questions
    .map((id) => qMap.get(String(id)))
    .filter(Boolean)
    .map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      subject: q.subject ? { _id: q.subject._id, name: q.subject.name } : null,
      topic: q.topic,
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
    }));
};

const runningPayload = async (attempt) => ({
  attempt: {
    id: attempt._id,
    test: attempt.test,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
  },
  serverTime: new Date().toISOString(),
  questions: await buildQuestionPayload(attempt),
  answers: attempt.answers.map((a) => ({
    question: a.question,
    selected: a.selected,
    markedForReview: a.markedForReview,
  })),
});

// finds an attempt owned by the logged-in student
const findOwnAttempt = (id, userId) => Attempt.findOne({ _id: id, user: userId });

// ---------- controllers ----------

export const startAttempt = async (req, res, next) => {
  try {
    const test = await Test.findOne({ _id: req.body.testId, isPublished: true });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    if (!test.questions.length) {
      return res.status(400).json({ success: false, message: "This test has no questions" });
    }

    let existing = await Attempt.findOne({
      user: req.user._id,
      test: test._id,
      status: "in_progress",
    });

    if (existing && existing.expiresAt.getTime() + GRACE_MS < Date.now()) {
      await finalizeAttempt(existing._id, true);
      existing = null;
    }

    if (existing) {
      return res.json({
        success: true,
        message: "Resuming your attempt",
        data: await runningPayload(existing),
      });
    }

    let attempt;
    try {
      attempt = await Attempt.create({
        user: req.user._id,
        test: test._id,
        questions: test.questions,
        answers: test.questions.map((q) => ({ question: q, selected: null, markedForReview: false })),
        expiresAt: new Date(Date.now() + test.durationMinutes * 60 * 1000),
      });
    } catch (error) {
      if (error.code === 11000) {
        attempt = await Attempt.findOne({
          user: req.user._id,
          test: test._id,
          status: "in_progress",
        });
      } else {
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      message: "Test started",
      data: await runningPayload(attempt),
    });
  } catch (error) {
    next(error);
  }
};

export const getAttempt = async (req, res, next) => {
  try {
    let attempt = await findOwnAttempt(req.params.id, req.user._id);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    if (attempt.status === "in_progress" && attempt.expiresAt.getTime() < Date.now()) {
      attempt = await finalizeAttempt(attempt._id, true);
    }

    if (attempt.status === "submitted") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        data: { submitted: true, result: resultSummary(attempt) },
      });
    }

    res.json({ success: true, data: await runningPayload(attempt) });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (req, res, next) => {
  try {
    const attempt = await findOwnAttempt(req.params.id, req.user._id);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Attempt already submitted" });
    }
    if (attempt.expiresAt.getTime() + GRACE_MS < Date.now()) {
      const done = await finalizeAttempt(attempt._id, true);
      return res.status(400).json({
        success: false,
        message: "Time is over. Your test was submitted automatically.",
        data: { result: resultSummary(done) },
      });
    }

    const { questionId, selected, markedForReview } = req.body;
    const set = {};
    if (selected !== undefined) set["answers.$[a].selected"] = selected === null ? null : Number(selected);
    if (markedForReview !== undefined) set["answers.$[a].markedForReview"] = Boolean(markedForReview);
    if (!Object.keys(set).length) {
      return res.status(400).json({ success: false, message: "Nothing to save" });
    }

    const qid = new mongoose.Types.ObjectId(questionId);
    const result = await Attempt.updateOne(
      { _id: attempt._id, user: req.user._id, status: "in_progress", "answers.question": qid },
      { $set: set },
      { arrayFilters: [{ "a.question": qid }] }
    );

    if (result.matchedCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Question is not part of this attempt" });
    }

    res.json({ success: true, message: "Saved" });
  } catch (error) {
    next(error);
  }
};

export const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await findOwnAttempt(req.params.id, req.user._id);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    const late = attempt.expiresAt.getTime() < Date.now();
    const done = await finalizeAttempt(attempt._id, late);

    res.json({
      success: true,
      message: "Test submitted",
      data: { result: resultSummary(done) },
    });
  } catch (error) {
    next(error);
  }
};

export const myAttempts = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ user: req.user._id, status: "submitted" })
      .populate("test", "title")
      .sort({ submittedAt: -1 })
      .limit(100);
    res.json({
      success: true,
      data: {
        attempts: attempts.map((a) => ({
          ...resultSummary(a),
          test: a.test ? { _id: a.test._id, title: a.test.title } : null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// correct answers and explanations are returned ONLY after submission
export const getResult = async (req, res, next) => {
  try {
    let attempt = await findOwnAttempt(req.params.id, req.user._id);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    if (attempt.status === "in_progress" && attempt.expiresAt.getTime() < Date.now()) {
      attempt = await finalizeAttempt(attempt._id, true);
    }
    if (attempt.status !== "submitted") {
      return res
        .status(403)
        .json({ success: false, message: "Submit the test to see the result" });
    }

    const questions = await Question.find({ _id: { $in: attempt.questions } }).populate(
      "subject",
      "name"
    );
    const qMap = new Map(questions.map((q) => [String(q._id), q]));
    const answerMap = new Map(attempt.answers.map((a) => [String(a.question), a]));

    const review = attempt.questions
      .map((id) => qMap.get(String(id)))
      .filter(Boolean)
      .map((q) => {
        const ans = answerMap.get(String(q._id));
        const selected = ans ? ans.selected : null;
        return {
          _id: q._id,
          text: q.text,
          options: q.options,
          subject: q.subject ? q.subject.name : "Unknown",
          topic: q.topic,
          marks: q.marks,
          selected,
          correctAnswer: q.correctAnswer,
          isCorrect: selected !== null && selected === q.correctAnswer,
          explanation: q.explanation,
        };
      });

    res.json({ success: true, data: { result: resultSummary(attempt), review } });
  } catch (error) {
    next(error);
  }
};