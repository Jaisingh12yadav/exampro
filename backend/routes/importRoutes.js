import express from "express";
import multer from "multer";
import path from "node:path";
import { previewImport, confirmImport } from "../controllers/importController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const ALLOWED_EXT = [".csv", ".xlsx"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      const err = new Error("Only .csv and .xlsx files are allowed");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const uploadFile = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File too large. Maximum size is 2 MB" : err.message;
    return res.status(400).json({ success: false, message });
  });
};

router.use(protect, adminOnly);

router.post("/preview", uploadFile, previewImport);
router.post("/confirm", uploadFile, confirmImport);

export default router;