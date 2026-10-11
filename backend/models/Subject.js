import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true }
);

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;