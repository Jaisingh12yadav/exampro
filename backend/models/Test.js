import mongoose from "mongoose";

const distributionSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    count: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    totalMarks: { type: Number, default: 0, min: 0 },
    passingMarks: { type: Number, default: 0, min: 0 },
    negativeMarking: { type: Boolean, default: false },
    // how many questions from each subject, e.g. Maths 50 + English 30
    distribution: { type: [distributionSchema], default: [] },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

testSchema.index({ isPublished: 1, createdAt: -1 });

const Test = mongoose.model("Test", testSchema);
export default Test;