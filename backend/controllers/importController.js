import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import { readRows, validateRows } from "../services/importService.js";

const PREVIEW_LIMIT = 20;

export const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a CSV or Excel file" });
    }

    let rows;
    try {
      rows = await readRows(req.file);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const { valid, invalid } = await validateRows(rows);
    res.json({
      success: true,
      message: "Preview ready. Nothing has been saved yet.",
      data: {
        totalRows: rows.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        preview: valid.slice(0, PREVIEW_LIMIT).map((v) => ({
          row: v.row,
          text: v.text,
          options: v.options,
          correctAnswer: v.correctAnswer,
          subject: v.subjectName,
          topic: v.topic,
          difficulty: v.difficulty,
          marks: v.marks,
          negativeMarks: v.negativeMarks,
        })),
        invalidRows: invalid,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a CSV or Excel file" });
    }

    let rows;
    try {
      rows = await readRows(req.file);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const createMissing = req.body.createMissingSubjects === "true";
    const { valid, invalid } = await validateRows(rows, { createMissingSubjects: createMissing });

    if (!valid.length) {
      return res.status(400).json({
        success: false,
        message: "No valid rows to import",
        data: { invalidRows: invalid },
      });
    }

    const subjects = await Subject.find().select("name");
    const subjectMap = new Map(subjects.map((s) => [s.name.toLowerCase(), s._id]));

    if (createMissing) {
      const names = [...new Set(valid.map((v) => v.subjectName))];
      for (const name of names) {
        if (!subjectMap.has(name.toLowerCase())) {
          const created = await Subject.create({ name });
          subjectMap.set(name.toLowerCase(), created._id);
        }
      }
    }

    const docs = valid.map((v) => ({
      text: v.text,
      options: v.options,
      correctAnswer: v.correctAnswer,
      subject: subjectMap.get(v.subjectName.toLowerCase()),
      topic: v.topic,
      difficulty: v.difficulty,
      marks: v.marks,
      negativeMarks: v.negativeMarks,
      explanation: v.explanation,
      createdBy: req.user._id,
    }));

    const inserted = await Question.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `${inserted.length} questions imported`,
      data: { importedCount: inserted.length, skippedCount: invalid.length, invalidRows: invalid },
    });
  } catch (error) {
    next(error);
  }
};