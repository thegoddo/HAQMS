const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const doctorRoutes = require("./routes/doctors");
const appointmentRoutes = require("./routes/appointments");
const queueRoutes = require("./routes/queue");
const reportRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

let corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://haqms-eta.vercel.app",
    "https://haqms-git-main-biswajit-shaws-projects.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"], // Explicitly allow Cookie header tracking
  credentials: true, // Mandates the generation of Access-Control-Allow-Credentials: true
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.options("*", cors(corsOptions)); // Handle preflight requests for all routes

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/reports", reportRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message:
      "Hospital Appointment and Queue Management System (HAQMS) Backend API",
    status: "Running",
    version: "1.0.0-deliberate-bugs",
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  // Always log full tracking metrics inside internal server streams for developers
  console.error("[CRITICAL-ERROR]:", err);

  const statusCode =
    err.status || res.statusCode === 200 ? 500 : res.statusCode;

  // Build a strict, predictable response payload envelope
  const errorResponse = {
    success: false,
    message: err.message || "An unexpected internal server error occurred!",
  };

  // Only attach diagnostic properties if explicitly running in a local local context
  if (!IS_PRODUCTION) {
    errorResponse.debug = {
      name: err.name,
      details: err.toString(),
      stack: err.stack,
    };
  }

  return res.status(statusCode).json(errorResponse);
});

// Listen on port
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   HAQMS BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`   ENVIRONMENT: ${process.env.NODE_ENV}`);
  console.log(`===================================================`);
});

// Catch unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Intentionally do not exit process so candidates see unhandled promise logs
});
