const express = require("express");
const { PrismaClient } = require("@prisma/client");
// We can now safely import and use the working authorization layers
const {
  authenticate,
  authorizeAdminOnlyLegacy,
  authorize,
} = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Helper regex for validation
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/; // Basic E.164 international standard format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/patients
// FIX: Database-level filtering, searching, and pagination
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;

    // Parse pagination variables safely
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // 1. Build a centralized database-level filter object
    const whereConditions = {};

    if (gender && gender !== "All") {
      whereConditions.gender = {
        equals: gender,
        mode: "insensitive",
      };
    }

    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // 2. Fetch only the requested subset (limit/offset) and count totals concurrently
    const [paginatedPatients, totalCount] = await prisma.$transaction([
      prisma.patient.findMany({
        where: whereConditions,
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.patient.count({ where: whereConditions }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      patients: paginatedPatients,
      pagination: {
        page,
        limit,
        totalPatients: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

// GET /api/patients/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve patient profile." });
  }
});

// POST /api/patients (Register patient)
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    if (!name || !phoneNumber || !age || !gender) {
      return res
        .status(400)
        .json({ error: "Name, phoneNumber, age, and gender are required." });
    }

    // FIX: Reject junk phone inputs
    if (!PHONE_REGEX.test(phoneNumber.trim())) {
      return res.status(400).json({ error: "Invalid phone number format." });
    }

    // FIX: Validate email format if provided
    if (email && !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const patient = await prisma.patient.create({
      data: {
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phoneNumber: phoneNumber.trim(),
        age: parseInt(age),
        gender,
        medicalHistory: medicalHistory || "", // Defaulting to empty string prevents UI crash alternatives
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: "Failed to register patient" });
  }
});

// DELETE /api/patients/:id
// FIX: The backend will now successfully block non-admins thanks to fixed auth middleware
router.delete(
  "/:id",
  authenticate,
  authorizeAdminOnlyLegacy,
  async (req, res) => {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      await prisma.patient.delete({ where: { id } });

      res.json({ message: `Successfully deleted patient ${patient.name}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete patient" });
    }
  },
);

module.exports = router;
