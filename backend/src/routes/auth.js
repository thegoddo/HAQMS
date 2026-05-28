const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth.js");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET =
  process.env.JWT_SECRET || "my-super-secret-secret-key-12345!!!";

const formatResponse = (res, statusCode, success, message, data = {}) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return formatResponse(res, 400, false, "All fields are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return formatResponse(
        res,
        400,
        false,
        "Please provide a valid email address.",
      );
    }

    if (password.length < 8) {
      return formatResponse(
        res,
        400,
        false,
        "Password must be at least 8 characters long.",
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();

    console.log(
      `[DEBUG] Registration attempt initiated for email: ${sanitizedEmail}`,
    );

    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });
    if (existingUser) {
      return formatResponse(
        res,
        400,
        false,
        "User already exists with this email",
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role: role || "RECEPTIONIST",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return formatResponse(res, 201, true, "User registered successfully", {
      user,
    });
  } catch (error) {
    console.error("Registration error details:", error);
    return formatResponse(res, 500, false, "Server error during registration");
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return formatResponse(res, 400, false, "Email and password are required");
    }

    // FIX: Normalize login email input so it correctly pairs with the registration database record
    const sanitizedEmail = email.trim().toLowerCase();
    console.log(`[AUTH] Login attempt for email: ${sanitizedEmail}`);

    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });
    if (!user) {
      // Security note: Generic message prevents account enumeration attacks
      return formatResponse(res, 401, false, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return formatResponse(res, 401, false, "Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "1d" }, // 1 Day is perfectly safe and standard for clinical operations dashboards
    );

    // FIX: Aligned with the global consistent response envelope structure
    return formatResponse(res, 200, true, "Login successful", {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    // FIX: Safely logging the full trace internally while locking out malicious client discovery
    console.error("Login error details:", error);
    return formatResponse(res, 500, false, "Internal Server Error");
  }
});
// GET /api/auth/me
// Returns current user details based on JWT
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return formatResponse(res, 404, false, "User context no longer exists");
    }

    // FIX: Wrapped flat payload inside standard layout consistency schemas
    return formatResponse(
      res,
      200,
      true,
      "Current user profile fetched successfully",
      { user },
    );
  } catch (error) {
    console.error("Context fetch error details:", error);
    return formatResponse(res, 500, false, "Internal Server Error");
  }
});
module.exports = router;
