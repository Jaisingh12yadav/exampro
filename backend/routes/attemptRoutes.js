import express from "express";
import { body, param } from "express-validator";
import {
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
  myAttempts,
  getResult,
} from "../controllers/attemptController.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

const idRule = param("id").isMongoId().withMessage("Invalid attempt id");

router.post(
  "/start",
  [body("testId").isMongoId().withMessage("Valid testId required")],
  validate,
  startAttempt
);

// must come before "/:id"
router.get("/my", myAttempts);

router.get("/:id", [idRule], validate, getAttempt);

router.put(
  "/:id/answers",
  [
    idRule,
    body("questionId").isMongoId().withMessage("Valid questionId required"),
    body("selected")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 3 })
      .withMessage("selected must be 0, 1, 2, 3 or null"),
    body("markedForReview").optional().isBoolean().withMessage("markedForReview must be true or false"),
  ],
  validate,
  saveAnswer
);

router.post("/:id/submit", [idRule], validate, submitAttempt);

router.get("/:id/result", [idRule], validate, getResult);

export default router;