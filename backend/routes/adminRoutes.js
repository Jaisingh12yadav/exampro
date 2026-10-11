import express from "express";
import { body, param } from "express-validator";
import {
  getStats,
  listStudents,
  setStudentActive,
  studentResults,
  testStats,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/students", listStudents);

router.patch(
  "/students/:id/active",
  [
    param("id").isMongoId().withMessage("Invalid student id"),
    body("isActive").isBoolean().withMessage("isActive must be true or false"),
  ],
  validate,
  setStudentActive
);

router.get(
  "/students/:id/results",
  [param("id").isMongoId().withMessage("Invalid student id")],
  validate,
  studentResults
);

router.get(
  "/tests/:id/stats",
  [param("id").isMongoId().withMessage("Invalid test id")],
  validate,
  testStats
);

export default router;