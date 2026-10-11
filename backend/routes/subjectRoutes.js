import express from "express";
import { body, param } from "express-validator";
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.get("/", listSubjects);

router.post(
  "/",
  adminOnly,
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
    body("description").optional().trim().isLength({ max: 300 }).withMessage("Description too long"),
  ],
  validate,
  createSubject
);

router.put(
  "/:id",
  adminOnly,
  [
    param("id").isMongoId().withMessage("Invalid subject id"),
    body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
    body("description").optional().trim().isLength({ max: 300 }).withMessage("Description too long"),
  ],
  validate,
  updateSubject
);

router.delete(
  "/:id",
  adminOnly,
  [param("id").isMongoId().withMessage("Invalid subject id")],
  validate,
  deleteSubject
);

export default router;