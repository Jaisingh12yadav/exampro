import express from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again after 15 minutes" },
});

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 60 }).withMessage("Name must be 2-60 characters"),
    body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6, max: 72 }).withMessage("Password must be 6-72 characters"),
  ],
  validate,
  register
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  login
);

router.get("/me", protect, getMe);

export default router;