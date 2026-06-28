// Shared in-memory store using React state via a tiny pub/sub.
// Keeps admin + public pages in sync within the same browser tab.
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

const rand = (n = 8) => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
};

const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const d = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;

const seedServices: Service[] = [
  { id: "s1", name: "1-on-1 Consultation", description: "Personalised one-to-one strategy session.", duration: 60, category: "Consulting", type: "paid", price: 999, maxAttendees: 1, active: true },
  { id: "s2", name: "Group Workshop", description: "Hands-on workshop in a small group setting.", duration: 90, category: "Workshop", type: "paid", price: 499, maxAttendees: 10, active: true },
  { id: "s3", name: "Free Discovery Call", description: "Quick intro call to see if we're a good fit.", duration: 30, category: "Consulting", type: "free", price: 0, maxAttendees: 1, active: true },
  { id: "s4", name: "Resume Review", description: "Detailed review of your CV with feedback.", duration: 45, category: "Career", type: "paid", price: 299, maxAttendees: 1, active: true },
];

const seedBookings: Booking[] = [
  { id: rand(), serviceId: "s1", date: d(Math.min(5, 28)), time: "10:00", attendees: 1, clientName: "Aarav Sharma", email: "aarav@example.com", phone: "+91 90000 11111", status: "confirmed", payment: "paid", createdAt: new Date().toISOString(), notes: "Wants to discuss product launch." },
  { id: rand(), serviceId: "s2", date: d(Math.min(8, 28)), time: "14:00", attendees: 3, clientName: "Priya Iyer", email: "priya@example.com", phone: "+91 90000 22222", status: "pending", payment: "paid", createdAt: new Date().toISOString() },
  { id: rand(), serviceId: "s3", date: d(Math.min(12, 28)), time: "11:30", attendees: 1, clientName: "Rohan Mehta", email: "rohan@example.com", phone: "+91 90000 33333", status: "confirmed", payment: "free", createdAt: new Date().toISOString() },
  { id: rand(), serviceId: "s4", date: d(Math.min(15, 28)), time: "15:00", attendees: 1, clientName: "Diya Kapoor", email: "diya@example.com", phone: "+91 90000 44444", status: "cancelled", payment: "paid", createdAt: new Date().toISOString() },
  { id: rand(), serviceId: "s1", date: d(Math.min(18, 28)), time: "16:00", attendees: 1, clientName: "Vikram Singh", email: "vikram@example.com", phone: "+91 90000 55555", status: "confirmed", payment: "paid", createdAt: new Date().toISOString() },
  { id: rand(), serviceId: "s2", date: d(Math.min(22, 28)), time: "10:30", attendees: 5, clientName: "Neha Reddy", email: "neha@example.com", phone: "+91 90000 66666", status: "pending", payment: "paid", createdAt: new Date().toISOString() },
];

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

export const store = {
  get: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  setServices: (s: Service[]) => { state.services = s; emit(); },
  setBookings: (b: Booking[]) => { state.bookings = b; emit(); },
  setAvailability: (a: Availability) => { state.availability = a; emit(); },
  newId: rand,
};

export function useStore() {
  const [, setT] = useState(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setT((x) => x + 1));
    return () => { unsub(); };
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
  const step = service.duration + s.availability.bufferMinutes;
  const slots: { time: string; full: boolean }[] = [];
  for (let t = startM; t + service.duration <= endM; t += step) {
    const time = minToTime(t);
    const booked = s.bookings.filter(
      (b) => b.serviceId === service.id && b.date === date && b.time === time && b.status !== "cancelled",
    );
    const taken = booked.reduce((acc, b) => acc + b.attendees, 0);
    const full = taken >= service.maxAttendees;
    slots.push({ time, full });
  }
  return slots;
}
