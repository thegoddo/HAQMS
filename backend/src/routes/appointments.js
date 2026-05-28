const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();
// GET /api/appointments
// List all appointments
router.get("/", authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // Fix: Join everything using Prisma's `include` in ONE primary query batch
    const detailedAppointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: "asc" },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            age: true,
            medicalHistory: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // Keeping your exact response shape so frontend mapping rules never break!
    res.json({
      success: true,
      count: detailedAppointments.length,
      appointments: detailedAppointments,
    });
  } catch (error) {
    // FIX: Log the full system trace error details internally for debugging
    console.error("[DATABASE ERROR] Failed to fetch appointments:", error);

    // FIX: Lock down client visibility by keeping the error message generic
    res.status(500).json({
      error: "Failed to retrieve appointments",
      // Removed details: error.message to protect execution context
    });
  }
});

// POST /api/appointments
router.post("/", authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res
        .status(400)
        .json({ error: "Patient, Doctor, and Appointment Date are required." });
    }

    // 1. Establish the window (e.g., 30 minutes per appointment slot)
    const slotStart = new Date(appointmentDate);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // Add 30 mins

    // 2. Check if a non-cancelled booking overlaps ANYWHERE in this time window
    const conflictingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: "CANCELLED" },
        appointmentDate: {
          gte: slotStart,
          lt: slotEnd,
        },
      },
    });

    if (conflictingBooking) {
      return res.status(400).json({
        error:
          "Double booking blocked. Doctor already has an active appointment block within this time slot.",
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: slotStart,
        reason: reason || "",
        status: "PENDING",
      },
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to book appointment", details: error.message });
  }
});
// PATCH /api/appointments/:id
// Update appointment status (COMPLETED, CANCELLED, etc.)
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update appointment", details: error.message });
  }
});

module.exports = router;
