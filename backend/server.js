import dns from "node:dns";
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

// the Google DNS fix is only for your home network
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const missing = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters in production");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();