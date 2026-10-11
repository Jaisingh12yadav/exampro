import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const name = process.env.ADMIN_NAME || "ExamPro Admin";
const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || "";

const run = async () => {
  if (!email || password.length < 8) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in .env first");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = "admin";
      existing.password = password; // re-hashed on save
      await existing.save();
      console.log("Existing user set as admin and password updated:", email);
    } else {
      await User.create({ name, email, password, role: "admin" });
      console.log("Admin created:", email);
    }
  } catch (error) {
    console.error("Failed:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();