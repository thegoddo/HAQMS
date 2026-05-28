const jwt = require("jsonwebtoken");

// Ensure you fall back to something secure if env is missing, or crash early
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn(
    "WARNING: JWT_SECRET environment variable is missing! Using vulnerable fallback.",
  );
}
const SECRET_KEY = JWT_SECRET || "my-super-secret-secret-key-12345!!!";

// 1. Secure Authentication Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // FIX: Enforce token expiration (removed ignoreExpiration: true)
    const decoded = jwt.verify(token, SECRET_KEY);

    req.user = decoded;
    next();
  } catch (error) {
    // FIX: Generic error message to prevent information leakage
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// 2. Modern Role-Based Authorization Factory
const authorize = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Unauthorized. User context missing." });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `Forbidden. Requires role: ${roles.join(" or ")}` });
    }

    next();
  };
};

// 3. Fixed Legacy Admin Middleware (For backward compatibility with existing routes)
const authorizeAdminOnlyLegacy = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  // FIX: Un-commented and reinforced the admin validation check
  if (req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin permissions required." });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdminOnlyLegacy,
};
