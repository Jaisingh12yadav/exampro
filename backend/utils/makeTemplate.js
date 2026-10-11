import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Questions");

sheet.columns = [
  { header: "question", key: "question", width: 50 },
  { header: "optionA", key: "optionA", width: 20 },
  { header: "optionB", key: "optionB", width: 20 },
  { header: "optionC", key: "optionC", width: 20 },
  { header: "optionD", key: "optionD", width: 20 },
  { header: "correctAnswer", key: "correctAnswer", width: 15 },
  { header: "subject", key: "subject", width: 24 },
  { header: "topic", key: "topic", width: 20 },
  { header: "difficulty", key: "difficulty", width: 12 },
  { header: "marks", key: "marks", width: 8 },
  { header: "negativeMarks", key: "negativeMarks", width: 14 },
  { header: "explanation", key: "explanation", width: 40 },
];
sheet.getRow(1).font = { bold: true };

sheet.addRow({
  question: "What is 20% of 150?",
  optionA: "20", optionB: "25", optionC: "30", optionD: "35",
  correctAnswer: "C",
  subject: "Quantitative Aptitude",
  topic: "Percentages",
  difficulty: "easy",
  marks: 1,
  negativeMarks: 0.25,
  explanation: "20% of 150 = 30",
});
sheet.addRow({
  question: "Choose the correct synonym of HAPPY",
  optionA: "Sad", optionB: "Joyful", optionC: "Angry", optionD: "Tired",
  correctAnswer: "B",
  subject: "English",
  topic: "Vocabulary",
  difficulty: "easy",
  marks: 1,
  negativeMarks: 0.25,
  explanation: "Joyful means happy",
});

await workbook.xlsx.writeFile("sample-questions.xlsx");
console.log("Created sample-questions.xlsx");
