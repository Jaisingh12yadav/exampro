import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// needed on Render/Heroku so rate limiting sees the real user IP
app.set("trust proxy", 1);

// CLIENT_URL can hold several addresses separated by commas
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      const err = new Error("Not allowed by CORS");
      err.statusCode = 403;
      return cb(err);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please slow down" },
});
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ExamPro API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error(err);
  const message =
    status >= 500 && process.env.NODE_ENV === "production" ? "Server error" : err.message || "Server error";
  res.status(status).json({ success: false, message });
});

export default app;