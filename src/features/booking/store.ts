// Shared store in frontend with REST API synchronisation to Express backend.
// Falls back to in-memory React state if the backend is down.
// Implements auto-polling to sync multiple clients and tabs simultaneously.
import { useEffect, useState } from "react";

export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  category: string;
  type: "free" | "paid";
  price: number; // INR
  maxAttendees: number;
  active: boolean;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "paid" | "free";

export type Booking = {
  id: string; // reference ID, 8-char alphanumeric
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  attendees: number;
  clientName: string;
  email: string;
  phone: string;
  notes?: string;
  status: BookingStatus;
  payment: PaymentStatus;
  createdAt: string;
  createdByAdmin?: boolean;
};

export type Availability = {
  workingDays: number[]; // 0=Sun..6=Sat
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  bufferMinutes: number;
  blockedDates: string[]; // YYYY-MM-DD
};

type State = {
  services: Service[];
  bookings: Booking[];
  availability: Availability;
};

const BACKEND_URL = "https://appointment-api.twinstdio.com";

const rand = (n = 8) => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
};

const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const d = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;

const seedServices: Service[] = [];

const seedBookings: Booking[] = [];

const state: State = {
  services: seedServices,
  bookings: seedBookings,
  availability: {
    workingDays: [1, 2, 3, 4, 5],
    startTime: "10:00",
    endTime: "18:00",
    bufferMinutes: 15,
    blockedDates: [],
  },
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let hasFetched = false;
async function fetchInitial() {
  if (hasFetched || typeof window === "undefined") return;
  hasFetched = true;
  try {
    const [svcsRes, bkgsRes, availRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/services`),
      fetch(`${BACKEND_URL}/api/bookings`),
      fetch(`${BACKEND_URL}/api/availability`),
    ]);

    if (svcsRes.ok && bkgsRes.ok && availRes.ok) {
      const services = await svcsRes.json();
      const bookings = await bkgsRes.json();
      const availability = await availRes.json();

      if (services.length > 0) {
        state.services = services;
      } else {
        // Seed backend if empty
        await Promise.all(
          seedServices.map((s) =>
            fetch(`${BACKEND_URL}/api/services`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(s),
            }),
          ),
        );
      }

      if (bookings.length > 0) {
        state.bookings = bookings;
      } else {
        // Seed backend if empty
        await Promise.all(
          seedBookings.map((b) =>
            fetch(`${BACKEND_URL}/api/bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(b),
            }),
          ),
        );
      }

      state.availability = availability;
      emit();
      console.log("[store] successfully synced initial data from backend API.");
    }
  } catch (err) {
    console.warn("[store] backend connection failed. using in-memory state:", err);
  }
}

// Background auto-polling loop to sync concurrent sessions
let pollIntervalId: any = null;
function startPolling() {
  if (pollIntervalId || typeof window === "undefined") return;
  pollIntervalId = setInterval(async () => {
    try {
      const [svcsRes, bkgsRes, availRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/services`),
        fetch(`${BACKEND_URL}/api/bookings`),
        fetch(`${BACKEND_URL}/api/availability`),
      ]);

      if (svcsRes.ok && bkgsRes.ok && availRes.ok) {
        const services = await svcsRes.json();
        const bookings = await bkgsRes.json();
        const availability = await availRes.json();

        let changed = false;

        if (JSON.stringify(state.services) !== JSON.stringify(services)) {
          state.services = services;
          changed = true;
        }
        if (JSON.stringify(state.bookings) !== JSON.stringify(bookings)) {
          state.bookings = bookings;
          changed = true;
        }
        if (JSON.stringify(state.availability) !== JSON.stringify(availability)) {
          state.availability = availability;
          changed = true;
        }

        if (changed) {
          emit();
        }
      }
    } catch (err) {
      // Ignore background network errors
    }
  }, 3000);
}

async function syncService(oldList: Service[], newList: Service[]) {
  try {
    const oldMap = new Map(oldList.map((s) => [s.id, s]));
    const newMap = new Map(newList.map((s) => [s.id, s]));

    for (const s of newList) {
      const oldS = oldMap.get(s.id);
      if (!oldS) {
        await fetch(`${BACKEND_URL}/api/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      } else if (JSON.stringify(oldS) !== JSON.stringify(s)) {
        await fetch(`${BACKEND_URL}/api/services/${s.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      }
    }

    for (const s of oldList) {
      if (!newMap.has(s.id)) {
        await fetch(`${BACKEND_URL}/api/services/${s.id}`, {
          method: "DELETE",
        });
      }
    }
  } catch (err) {
    console.warn("[store] service sync failed:", err);
  }
}

async function syncBooking(oldList: Booking[], newList: Booking[]) {
  try {
    const oldMap = new Map(oldList.map((b) => [b.id, b]));

    for (const b of newList) {
      const oldB = oldMap.get(b.id);
      if (!oldB) {
        await fetch(`${BACKEND_URL}/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(b),
        });
      } else if (JSON.stringify(oldB) !== JSON.stringify(b)) {
        await fetch(`${BACKEND_URL}/api/bookings/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(b),
        });
      }
    }
  } catch (err) {
    console.warn("[store] booking sync failed:", err);
  }
}

async function syncAvailability(a: Availability) {
  try {
    await fetch(`${BACKEND_URL}/api/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
  } catch (err) {
    console.warn("[store] availability sync failed:", err);
  }
}

export const store = {
  get: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    fetchInitial();
    startPolling();
    return () => {
      listeners.delete(cb);
      if (listeners.size === 0 && pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };
  },
  setServices: (s: Service[]) => {
    const old = [...state.services];
    state.services = s;
    emit();
    syncService(old, s);
  },
  setBookings: (b: Booking[]) => {
    const old = [...state.bookings];
    state.bookings = b;
    emit();
    syncBooking(old, b);
  },
  setAvailability: (a: Availability) => {
    state.availability = a;
    emit();
    syncAvailability(a);
  },
  newId: rand,
};

export function useStore() {
  const [, setT] = useState(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setT((x) => x + 1));
    return () => {
      unsub();
    };
  }, []);
  return store.get();
}

// ---------- Slot generation ----------
export function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function getSlots(date: string, service: Service): { time: string; full: boolean }[] {
  const s = store.get();
  const dt = new Date(date + "T00:00:00");
  const dow = dt.getDay();

  if (!s.availability.workingDays.includes(dow)) return [];
  if (s.availability.blockedDates.includes(date)) return [];

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date < todayStr) return [];

  const startM = timeToMin(s.availability.startTime);
  const endM = timeToMin(s.availability.endTime);
  const buffer = s.availability.bufferMinutes;

  const slots: { time: string; full: boolean }[] = [];
  const step = service.duration + buffer;

  for (let t = startM; t + service.duration <= endM; t += step) {
    const time = minToTime(t);
    const candidateStart = t;
    const candidateEnd = t + service.duration;

    let currentSlotAttendees = 0;
    let isOverlapBlocked = false;

    for (const b of s.bookings) {
      if (b.status === "cancelled" || b.date !== date) continue;

      const bSvc = s.services.find((x) => x.id === b.serviceId);
      if (!bSvc) continue;

      const bStart = timeToMin(b.time);
      const bEnd = bStart + bSvc.duration;

      // Same slot: group session registration
      if (b.serviceId === service.id && b.time === time) {
        currentSlotAttendees += b.attendees;
      } else {
        // Overlap scheduling conflict check:
        // Candidate start is less than booked end + buffer AND booked start is less than candidate end + buffer
        const hasOverlap = candidateStart < bEnd + buffer && bStart < candidateEnd + buffer;
        if (hasOverlap) {
          isOverlapBlocked = true;
          break;
        }
      }
    }

    if (isOverlapBlocked) continue;

    const full = currentSlotAttendees >= service.maxAttendees;
    slots.push({ time, full });
  }

  return slots;
}
