import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // role is always "student" here; never trust role from the browser
    const user = await User.create({ name, email, password, role: "student" });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user: userResponse(user), token: generateToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is disabled" });
    }

    res.json({
      success: true,
      message: "Login successful",
      data: { user: userResponse(user), token: generateToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, data: { user: userResponse(req.user) } });
};