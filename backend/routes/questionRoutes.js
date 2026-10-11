import express from "express";
import { body, param, query } from "express-validator";
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

// every question route is admin-only so students never see correct answers
router.use(protect, adminOnly);

const questionRules = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body("text").trim().isLength({ min: 3, max: 2000 })).withMessage("Question text must be 3-2000 characters"),
    opt(body("options").isArray({ min: 4, max: 4 })).withMessage("Exactly 4 options required"),
    body("options.*").optional().trim().isLength({ min: 1, max: 500 }).withMessage("Each option must be 1-500 characters"),
    opt(body("correctAnswer").isInt({ min: 0, max: 3 })).withMessage("correctAnswer must be 0, 1, 2 or 3"),
    opt(body("subject").isMongoId()).withMessage("Valid subject id required"),
    body("topic").optional().trim().isLength({ max: 100 }).withMessage("Topic too long"),
    body("difficulty").optional().isIn(["easy", "medium", "hard"]).withMessage("Difficulty must be easy, medium or hard"),
    body("marks").optional().isFloat({ min: 0 }).withMessage("Marks must be 0 or more"),
    body("negativeMarks").optional().isFloat({ min: 0 }).withMessage("Negative marks must be 0 or more"),
    body("explanation").optional().trim().isLength({ max: 2000 }).withMessage("Explanation too long"),
  ];
};

// query validation blocks injection like ?subject[$ne]=x
router.get(
  "/",
  [
    query("subject").optional().isMongoId().withMessage("Valid subject id required"),
    query("difficulty").optional().isIn(["easy", "medium", "hard"]).withMessage("Invalid difficulty"),
    query("topic").optional().isString().isLength({ max: 100 }).withMessage("Invalid topic"),
    query("page").optional().isInt({ min: 1 }).withMessage("Invalid page"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Invalid limit"),
  ],
  validate,
  listQuestions
);

router.get("/:id", [param("id").isMongoId().withMessage("Invalid question id")], validate, getQuestion);

router.post("/", questionRules(true), validate, createQuestion);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid question id"), ...questionRules(false)],
  validate,
  updateQuestion
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid question id")],
  validate,
  deleteQuestion
);

export default router;