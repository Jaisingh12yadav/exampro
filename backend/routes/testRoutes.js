import express from "express";
import { body, param } from "express-validator";
import {
  adminListTests,
  adminGetTest,
  createTest,
  updateTest,
  autoFillTest,
  togglePublish,
  deleteTest,
  listPublishedTests,
  getPublishedTest,
} from "../controllers/testController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

const idRule = param("id").isMongoId().withMessage("Invalid test id");

const testRules = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body("title").trim().isLength({ min: 3, max: 120 })).withMessage("Title must be 3-120 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description too long"),
    opt(body("durationMinutes").isInt({ min: 1, max: 600 })).withMessage("Duration must be 1-600 minutes"),
    body("passingMarks").optional().isFloat({ min: 0 }).withMessage("Passing marks must be 0 or more"),
    body("negativeMarking").optional().isBoolean().withMessage("negativeMarking must be true or false"),
    body("distribution").optional().isArray().withMessage("Distribution must be a list"),
    body("distribution.*.subject").optional().isMongoId().withMessage("Invalid subject id in distribution"),
    body("distribution.*.count").optional().isInt({ min: 1 }).withMessage("Count must be at least 1"),
    body("questions").optional().isArray().withMessage("Questions must be a list"),
    body("questions.*").optional().isMongoId().withMessage("Invalid question id"),
  ];
};

// ----- Admin routes (must come before "/:id") -----
router.get("/admin/all", adminOnly, adminListTests);
router.get("/admin/:id", adminOnly, [idRule], validate, adminGetTest);
router.post("/", adminOnly, testRules(true), validate, createTest);
router.put("/:id", adminOnly, [idRule, ...testRules(false)], validate, updateTest);
router.post("/:id/auto-fill", adminOnly, [idRule], validate, autoFillTest);
router.patch("/:id/publish", adminOnly, [idRule], validate, togglePublish);
router.delete("/:id", adminOnly, [idRule], validate, deleteTest);

// ----- Student routes -----
router.get("/", listPublishedTests);
router.get("/:id", [idRule], validate, getPublishedTest);

export default router;