import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import Subject from "../models/Subject.js";

const REQUIRED = ["question", "optiona", "optionb", "optionc", "optiond", "correctanswer", "subject"];
const MAX_ROWS = 1000;

const normalizeKey = (key) => String(key || "").toLowerCase().replace(/[^a-z]/g, "");

const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((r) => r.text).join("").trim();
    if (value.text !== undefined) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
    return String(value).trim();
  }
  return String(value).trim();
};

const parseCsv = (buffer) => {
  const records = parse(buffer, {
    columns: (header) => header.map(normalizeKey),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
  return records;
};

const parseExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Excel file has no sheets");

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = normalizeKey(cellText(cell.value));
  });

  const records = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasData = false;
    headers.forEach((key, col) => {
      if (!key) return;
      const text = cellText(row.getCell(col).value);
      if (text) hasData = true;
      record[key] = text;
    });
    if (hasData) records.push(record);
  });
  return records;
};

export const readRows = async (file) => {
  const name = file.originalname.toLowerCase();
  const rows = name.endsWith(".csv") ? parseCsv(file.buffer) : await parseExcel(file.buffer);

  if (!rows.length) throw new Error("File has no data rows");
  if (rows.length > MAX_ROWS) throw new Error(`Too many rows. Maximum is ${MAX_ROWS} per file`);

  const columns = Object.keys(rows[0]);
  const missing = REQUIRED.filter((c) => !columns.includes(c));
  if (missing.length) {
    throw new Error(
      `Missing columns: ${missing.join(", ")}. Required: question, optionA, optionB, optionC, optionD, correctAnswer, subject`
    );
  }
  return rows;
};

const toAnswerIndex = (value, options) => {
  const v = String(value).trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(v)) return "ABCD".indexOf(v);
  if (["1", "2", "3", "4"].includes(v)) return Number(v) - 1;
  const byText = options.findIndex((o) => o.toLowerCase() === String(value).trim().toLowerCase());
  return byText;
};

const toNumber = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

// returns { valid: [...], invalid: [{ row, errors }] }
export const validateRows = async (rows, { createMissingSubjects = false } = {}) => {
  const subjects = await Subject.find().select("name");
  const subjectMap = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  const valid = [];
  const invalid = [];
  const seen = new Set();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2; // row 1 is the header
    const errors = [];

    const text = (r.question || "").trim();
    const options = [r.optiona, r.optionb, r.optionc, r.optiond].map((o) => (o || "").trim());

    if (text.length < 3 || text.length > 2000) errors.push("Question must be 3-2000 characters");
    options.forEach((o, idx) => {
      if (!o) errors.push(`Option ${"ABCD"[idx]} is empty`);
      else if (o.length > 500) errors.push(`Option ${"ABCD"[idx]} is too long`);
    });
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4 && options.every(Boolean)) {
      errors.push("Options must all be different");
    }

    const correctAnswer = toAnswerIndex(r.correctanswer || "", options);
    if (correctAnswer < 0 || correctAnswer > 3) {
      errors.push("correctAnswer must be A, B, C, D (or 1-4)");
    }

    const subjectName = (r.subject || "").trim();
    if (!subjectName) errors.push("Subject is required");
    else if (!subjectMap.has(subjectName.toLowerCase()) && !createMissingSubjects) {
      errors.push(`Subject "${subjectName}" does not exist`);
    }

    const difficulty = (r.difficulty || "medium").toLowerCase();
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      errors.push("Difficulty must be easy, medium or hard");
    }

    const marks = toNumber(r.marks, 1);
    const negativeMarks = toNumber(r.negativemarks, 0);
    if (Number.isNaN(marks) || marks < 0) errors.push("Marks must be a number, 0 or more");
    if (Number.isNaN(negativeMarks) || negativeMarks < 0) {
      errors.push("Negative marks must be a number, 0 or more");
    }

    const topic = (r.topic || "General").trim().slice(0, 100) || "General";
    const explanation = (r.explanation || "").trim();
    if (explanation.length > 2000) errors.push("Explanation is too long");

    const dupKey = `${text.toLowerCase()}|${subjectName.toLowerCase()}`;
    if (!errors.length && seen.has(dupKey)) errors.push("Duplicate of an earlier row in this file");
    seen.add(dupKey);

    if (errors.length) {
      invalid.push({ row: rowNumber, errors, question: text.slice(0, 80) });
    } else {
      valid.push({
        row: rowNumber,
        text,
        options,
        correctAnswer,
        subjectName,
        topic,
        difficulty,
        marks,
        negativeMarks,
        explanation,
      });
    }
  }

  return { valid, invalid };
};