// Optional Node.js (Express) backend stub.
// The web app currently uses React state only, per the spec.
// This file is a starting point if you want to persist bookings to a server later.
//
// Run with: node backend/server.js
//
// It mirrors the in-memory store shape used by the frontend.

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const db = {
  services: [],
  bookings: [],
  availability: {
    workingDays: [1, 2, 3, 4, 5],
    startTime: "10:00",
    endTime: "18:00",
    bufferMinutes: 15,
    blockedDates: [],
  },
};

app.get("/api/services", (_req, res) => res.json(db.services));
app.post("/api/services", (req, res) => { db.services.push(req.body); res.json(req.body); });
app.put("/api/services/:id", (req, res) => {
  db.services = db.services.map((s) => (s.id === req.params.id ? req.body : s));
  res.json(req.body);
});
app.delete("/api/services/:id", (req, res) => {
  db.services = db.services.filter((s) => s.id !== req.params.id);
  res.json({ ok: true });
});

app.get("/api/bookings", (_req, res) => res.json(db.bookings));
app.post("/api/bookings", (req, res) => { db.bookings.push(req.body); res.json(req.body); });
app.patch("/api/bookings/:id", (req, res) => {
  db.bookings = db.bookings.map((b) => (b.id === req.params.id ? { ...b, ...req.body } : b));
  res.json({ ok: true });
});

app.get("/api/availability", (_req, res) => res.json(db.availability));
app.put("/api/availability", (req, res) => { db.availability = req.body; res.json(db.availability); });

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
