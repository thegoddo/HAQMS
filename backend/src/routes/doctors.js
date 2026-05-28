const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors/
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    // 1. Build a type-safe Prisma filter object
    const whereConditions = {};

    if (search) {
      whereConditions.name = {
        contains: search,
        mode: "insensitive", // Replaces "ILIKE %search%" securely
      };
    }

    if (specialization && specialization !== "All") {
      whereConditions.specialization = {
        equals: specialization,
      };
    }

    // 2. Fetch data cleanly via Prisma Client (Immune to SQL Injection)
    const doctors = await prisma.doctor.findMany({
      where: whereConditions,
      orderBy: { name: "asc" },
    });

    // Keeping your exact response shape to match existing client expectations
    res.json(doctors);
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to fetch doctors:", error);
    // FIX: Generic safe message with no leaked internal schema traces
    res.status(500).json({ error: "Database execution failure" });
  }
});

// GET /api/doctors/stats
router.get("/stats", authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // FIX: Execute independent aggregate calculations concurrently using Promise.all
    const [
      totalDoctors,
      surgeonsCount,
      averageFeeResult,
      highestExperienceResult,
    ] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({ where: { department: "Surgery" } }),
      prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
      prisma.doctor.aggregate({ _max: { experience: true } }),
    ]);

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFeeResult._avg.consultationFee || 0),
        maxExperience: highestExperienceResult._max.experience || 0,
      },
      debugInfo: {
        executionTimeMs: durationMs,
        notes: "Optimized utilizing parallel async database resolutions.",
      },
    });
  } catch (error) {
    console.error("[METRICS ERROR] Summary calculation failure:", error);
    res.status(500).json({ error: "Failed to compile aggregate metrics" });
  }
});

// GET /api/doctors/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    console.error(
      `[FETCH ERROR] Failed to find doctor context: ${req.params.id}`,
      error,
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
