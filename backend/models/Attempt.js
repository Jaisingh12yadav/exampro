import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selected: { type: Number, min: 0, max: 3, default: null },
    markedForReview: { type: Boolean, default: false },
  },
  { _id: false }
);

const subjectStatSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    name: String,
    total: Number,
    correct: Number,
    wrong: Number,
    unattempted: Number,
    score: Number,
    maxScore: Number,
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    answers: [answerSchema],
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
    autoSubmitted: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    subjectStats: [subjectStatSchema],
  },
  { timestamps: true }
);

attemptSchema.index({ user: 1, createdAt: -1 });
attemptSchema.index({ test: 1, status: 1 });
// a student can have only one running attempt per test
attemptSchema.index(
  { user: 1, test: 1 },
  { unique: true, partialFilterExpression: { status: "in_progress" } }
);

const Attempt = mongoose.model("Attempt", attemptSchema);
export default Attempt;