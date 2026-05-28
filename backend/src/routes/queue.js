const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// List all active queue tokens for the public monitor board
router.get("/", async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(tokens);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve queue", details: error.message });
  }
});

// POST /api/queue/checkin
router.post("/checkin", authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res
        .status(400)
        .json({ error: "Patient and Doctor ID are required for check-in." });
    }

    // 1. Generate a standardized date string for today (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Atomic Upsert: Lock, increment, and fetch the next token number in ONE database transaction
    const counter = await prisma.queueCounter.upsert({
      where: {
        doctorId_dateStr: {
          doctorId,
          dateStr: todayStr,
        },
      },
      update: {
        lastToken: { increment: 1 }, // Atomic database-level addition
      },
      create: {
        doctorId,
        dateStr: todayStr,
        lastToken: 1,
      },
    });

    const nextTokenNumber = counter.lastToken;

    // 3. Insert the new token with our guaranteed unique token number
    const newToken = await prisma.queueToken.create({
      data: {
        tokenNumber: nextTokenNumber,
        patientId,
        doctorId,
        appointmentId: appointmentId || null,
        status: "WAITING",
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.status(201).json({
      message: "Checked in successfully. Token generated.",
      token: newToken,
    });
  } catch (error) {
    console.error("Queue check-in error:", error);
    res.status(500).json({ error: "Check-in failed", details: error.message });
  }
});

// PATCH /api/queue/:id
// Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(updatedToken);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update queue token", details: error.message });
  }
});

module.exports = router;
