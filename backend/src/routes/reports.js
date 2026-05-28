const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Optimized dashboard reporting using native database aggregations
router.get("/doctor-stats", authenticate, async (req, res) => {
  try {
    const start = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch core doctor info and today's tokens concurrently with a status aggregation
    const [doctors, statusCounts, todayTokens] = await prisma.$transaction([
      // Get doctors
      prisma.doctor.findMany({
        select: {
          id: true,
          name: true,
          specialization: true,
          department: true,
          consultationFee: true,
        },
      }),
      // Let the DB group and count statuses natively (Returns tiny summary arrays)
      prisma.appointment.groupBy({
        by: ["doctorId", "status"],
        _count: { _all: true },
      }),
      // Let the DB group and count today's tokens natively
      prisma.queueToken.groupBy({
        by: ["doctorId"],
        where: { createdAt: { gte: today } },
        _count: { _all: true },
      }),
    ]);

    // 2. Build quick map lookups for O(1) assembly speed
    const statsMap = {};
    statusCounts.forEach((c) => {
      if (!statsMap[c.doctorId])
        statsMap[c.doctorId] = { COMPLETED: 0, CANCELLED: 0, total: 0 };
      statsMap[c.doctorId][c.status] = c._count._all;
      statsMap[c.doctorId].total += c._count._all;
    });

    const tokenMap = {};
    todayTokens.forEach((t) => {
      tokenMap[t.doctorId] = t._count._all;
    });

    // 3. Assemble the lightweight report data
    const reportData = doctors.map((doc) => {
      const docStats = statsMap[doc.id] || {
        COMPLETED: 0,
        CANCELLED: 0,
        total: 0,
      };
      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: docStats.total,
        completedAppointments: docStats.COMPLETED,
        cancelledAppointments: docStats.CANCELLED,
        todayQueueSize: tokenMap[doc.id] || 0,
        revenue: docStats.COMPLETED * doc.consultationFee,
      };
    });

    res.json({
      success: true,
      timeTakenMs: Date.now() - start,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate report" });
  }
});

module.exports = router;
