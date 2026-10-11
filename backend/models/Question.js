import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    options: {
      type: [{ type: String, required: true, trim: true, maxlength: 500 }],
      validate: {
        validator: (arr) => arr.length === 4,
        message: "Exactly 4 options are required",
      },
    },
    // index of the correct option: 0 = A, 1 = B, 2 = C, 3 = D
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    topic: { type: String, trim: true, maxlength: 100, default: "General" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    explanation: { type: String, trim: true, maxlength: 2000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

questionSchema.index({ subject: 1, topic: 1, difficulty: 1 });

const Question = mongoose.model("Question", questionSchema);
export default Question;