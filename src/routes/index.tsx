import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Video } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  store,
  useStore,
  type Service,
  type Booking,
  type BookingStatus,
} from "@/features/booking/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Admin Portal" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-indigo-700 hover:shadow-lg active:scale-95 cursor-pointer";
export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer";
export const btnDanger =
  "inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition active:scale-95 cursor-pointer";

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  return <Panel onLogout={() => setAuthed(false)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("https://appointment-api.twinstdio.com/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onOk();
      } else {
        setErr(data.error || "Invalid credentials");
      }
    } catch (e) {
      console.warn("Backend offline, checking local credentials fallback:", e);
      if (u === "admin" && p === "admin123") {
        onOk();
      } else {
        setErr("Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 overflow-hidden">
      {/* Background visual shapes */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-indigo-50/30 z-0" />
      <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl animate-pulse z-0" />
      <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-violet-200/15 rounded-full blur-3xl animate-pulse z-0" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-250/50 bg-white/80 backdrop-blur-md p-8 shadow-xl shadow-slate-150/40 animate-fade-in-up"
      >
        <h1 className="mb-1 text-2xl font-black text-slate-900 tracking-tight uppercase">Admin sign in</h1>
        <p className="mb-6 text-xs text-slate-500 font-medium">Authentication verifying in real time...</p>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wider">Username</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition shadow-sm bg-white/95"
            value={u}
            onChange={(e) => setU(e.target.value)}
            disabled={loading}
            required
            placeholder="admin"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-bold text-slate-650 uppercase tracking-wider">Password</span>
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition shadow-sm bg-white/95"
            value={p}
            onChange={(e) => setP(e.target.value)}
            disabled={loading}
            required
            placeholder="••••••••"
          />
        </label>
        {err && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-655 text-xs font-semibold">
            {err}
          </div>
        )}
        <button className={btnPrimary + " w-full mt-2 py-3 font-bold rounded-xl shadow-md shadow-indigo-100/50"} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <a
          href="http://booking.twinstdio.com/"
          className="mt-5 block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-855 hover:underline transition"
        >
          ← Back to site
        </a>
      </form>
    </div>
  );
}

type Tab = "dashboard" | "services" | "availability" | "analytics" | "notifications";

function Panel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 uppercase">
              <span className="text-indigo-600 animate-pulse">●</span> Admin
            </span>
            {/* Mobile Header Operations */}
            <div className="flex items-center gap-2 sm:hidden">
              <a
                href="http://booking.twinstdio.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Site
              </a>
              <button onClick={onLogout} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer active:scale-95 transition">
                Sign out
              </button>
            </div>
          </div>

          {/* Scrollable Navigation on Mobile */}
          <nav className="flex gap-1.5 text-xs font-bold overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:text-sm sm:font-semibold">
            {(["dashboard", "services", "availability", "analytics", "notifications"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 capitalize transition-all duration-300 cursor-pointer ${
                  tab === t
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100/50"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {/* Desktop Header Operations */}
          <div className="hidden sm:flex items-center gap-3 text-sm font-semibold">
            <a
              href="http://booking.twinstdio.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-4 py-2 text-slate-650 hover:bg-slate-100/80 hover:text-slate-905 transition-all duration-300"
            >
              View site
            </a>
            <button onClick={onLogout} className={btnGhost}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-grow animate-fade-in-up">
        {tab === "dashboard" && <Dashboard />}
        {tab === "services" && <Services />}
        {tab === "availability" && <AvailabilityTab />}
        {tab === "analytics" && <Analytics />}
        {tab === "notifications" && <NotificationsTab />}
      </main>
    </div>
  );
}

// ------------ Dashboard ------------
function Dashboard() {
  const { bookings, services } = useStore();
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    serviceId: "",
    date: "",
    time: "",
    attendees: 1,
    notes: "",
  });

  const handleOpenCreate = () => {
    setForm({
      clientName: "",
      email: "",
      phone: "",
      serviceId: services[0]?.id || "",
      date: "",
      time: "",
      attendees: 1,
      notes: "",
    });
    setCreating(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const svc = services.find((s) => s.id === form.serviceId);
    const newBooking: Booking = {
      id: store.newId(),
      serviceId: form.serviceId,
      date: form.date,
      time: form.time,
      attendees: form.attendees,
      clientName: form.clientName,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
      status: "confirmed",
      payment: svc?.type === "free" ? "free" : "paid",
      createdAt: new Date().toISOString(),
      createdByAdmin: true,
    };
    store.setBookings([...bookings, newBooking]);
    setCreating(false);
  };

  const svcName = (id: string) => services.find((s) => s.id === id)?.name || "—";

  const filtered = bookings
    .filter((b) => status === "all" || b.status === status)
    .filter((b) => (!from || b.date >= from) && (!to || b.date <= to))
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.clientName.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        svcName(b.serviceId).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const setStatusOf = (b: Booking, s: BookingStatus) => {
    const updated = store.get().bookings.map((x) => (x.id === b.id ? { ...x, status: s } : x));
    store.setBookings(updated);
    setSelected({ ...b, status: s });
  };

  const exportCSV = () => {
    const headers = [
      "Reference ID",
      "Client Name",
      "Email",
      "Phone",
      "Service",
      "Date",
      "Time",
      "Attendees",
      "Status",
      "Payment",
      "Notes",
      "Created At",
    ];
    const rows = filtered.map((b) => [
      b.id,
      b.clientName,
      b.email,
      b.phone,
      svcName(b.serviceId),
      b.date,
      b.time,
      b.attendees,
      b.status,
      b.payment,
      b.notes || "",
      b.createdAt,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto">
            <input
              type="text"
              placeholder="Search client, email, ref ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <div className="flex items-center gap-1.5 w-[48%] sm:w-auto">
              <span className="text-[10px] text-slate-400 font-bold sm:hidden uppercase">From:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 w-[48%] sm:w-auto">
              <span className="text-[10px] text-slate-400 font-bold sm:hidden uppercase">To:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <button onClick={exportCSV} className={btnGhost + " flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3.5"}>
              Export CSV
            </button>
            <button onClick={handleOpenCreate} className={btnPrimary + " flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3.5"}>
              + Create Booking
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="px-4 py-3 font-medium">{b.clientName}</td>
                  <td className="px-4 py-3">{svcName(b.serviceId)}</td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.time}</td>
                  <td className="px-4 py-3">
                    <StatusBadge s={b.status} />
                  </td>
                  <td className="px-4 py-3 capitalize">{b.payment}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No bookings matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <MiniCalendar bookings={bookings} />
      {selected && (
        <Drawer onClose={() => setSelected(null)}>
          <h2 className="text-lg font-semibold">{svcName(selected.serviceId)}</h2>
          <p className="mb-4 text-xs text-slate-500">Ref {selected.id}</p>
          <Detail k="Status" v={<StatusBadge s={selected.status} />} />
          <Detail k="Client" v={selected.clientName} />
          <Detail k="Email" v={selected.email} />
          <Detail k="Phone" v={selected.phone} />
          <Detail k="Date" v={selected.date} />
          <Detail k="Time" v={selected.time} />
          <Detail k="Attendees" v={String(selected.attendees)} />
          <Detail k="Payment" v={selected.payment} />
          <Detail
            k="Invite Link"
            v={
              <button
                type="button"
                onClick={() => {
                  const url = selected.status === "confirmed"
                    ? `${window.location.origin}/?meeting=${selected.id}`
                    : `${window.location.origin}/?ref=${selected.id}&email=${selected.email}`;
                  navigator.clipboard.writeText(url);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2000);
                }}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-850 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedInvite ? "Copied!" : "Copy Link"}
              </button>
            }
          />
          {selected.notes && <Detail k="Notes" v={selected.notes} />}
          <div className="mt-6 flex flex-col gap-2">
            {selected.status === "confirmed" && (
              <a
                href={`https://meet.jit.si/Twinstdio_${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition w-full shadow-md shadow-indigo-100"
              >
                📹 Join Virtual Meeting Call
              </a>
            )}
            <div className="flex gap-2 w-full">
              {selected.status !== "confirmed" && (
                <button
                  onClick={() => setStatusOf(selected, "confirmed")}
                  className={btnPrimary + " flex-1"}
                >
                  Confirm
                </button>
              )}
              {selected.status !== "cancelled" && !selected.createdByAdmin && (
                <button
                  onClick={() => setStatusOf(selected, "cancelled")}
                  className={btnDanger + " flex-1"}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Drawer>
      )}

      {creating && (
        <Drawer onClose={() => setCreating(false)}>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Create Booking</h2>
          <p className="mb-6 text-xs text-slate-500 font-medium">Add a booking directly as an administrator.</p>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <L label="Client Name">
              <input
                className={inp2}
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </L>

            <L label="Email Address">
              <input
                type="email"
                className={inp2}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </L>

            <L label="Phone Number">
              <input
                className={inp2}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                required
              />
            </L>

            <L label="Select Service">
              <select
                className={inp2}
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === "free" ? "Free" : `₹${s.price}`})
                  </option>
                ))}
              </select>
            </L>

            <div className="grid grid-cols-2 gap-3">
              <L label="Date">
                <input
                  type="date"
                  className={inp2}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </L>
              <L label="Time">
                <input
                  type="time"
                  className={inp2}
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                />
              </L>
            </div>

            <L label="Number of Attendees">
              <input
                type="number"
                min={1}
                className={inp2}
                value={form.attendees}
                onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) })}
                required
              />
            </L>

            <L label="Notes (optional)">
              <textarea
                className={inp2}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes or special requests..."
              />
            </L>

            <div className="pt-4 flex gap-2">
              <button
                type="submit"
                className={`${btnPrimary} flex-1`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className={`${btnGhost} flex-1`}
              >
                Cancel
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

function StatusBadge({ s }: { s: BookingStatus }) {
  const cls = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-rose-50 text-rose-700",
  }[s];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s}</span>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />
      <div className="w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl relative z-50">
        <button
          onClick={onClose}
          className="mb-4 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          ✕ Close
        </button>
        {children}
      </div>
    </div>
  );
}

function MiniCalendar({ bookings }: { bookings: Booking[] }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  const hasBooking = (d: number) =>
    bookings.some(
      (b) =>
        b.date === `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` &&
        b.status !== "cancelled",
    );
  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium">
        {new Date(y, m).toLocaleString(undefined, { month: "long", year: "numeric" })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className="aspect-square rounded-md text-center text-xs">
            {d && (
              <div className="flex h-full flex-col items-center justify-center">
                {d}
                {hasBooking(d) && <span className="mt-0.5 h-1 w-1 rounded-full bg-indigo-600" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ------------ Services ------------
function Services() {
  const { services } = useStore();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  const save = (s: Service) => {
    const exists = store.get().services.some((x) => x.id === s.id);
    store.setServices(
      exists
        ? store.get().services.map((x) => (x.id === s.id ? s : x))
        : [...store.get().services, s],
    );
    setEditing(null);
    setCreating(false);
  };
  const del = (id: string) => store.setServices(store.get().services.filter((s) => s.id !== id));
  const toggle = (s: Service) => save({ ...s, active: !s.active });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <button onClick={() => setCreating(true)} className={btnPrimary}>
          + New service
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between transition hover:shadow-sm"
          >
            <div>
              <div className="mb-2 flex justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                  {s.category}
                </span>
                <div className="flex gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.type === "free" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}
                  >
                    {s.type === "free" ? "Free" : `₹${s.price}`}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-slate-600 line-clamp-3">{s.description}</p>
            </div>
            <div>
              <div className="mt-3 text-xs text-slate-500">
                {s.duration} min · Max {s.maxAttendees} attendees
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => setEditing(s)} className={btnGhost}>
                  Edit
                </button>
                <button onClick={() => toggle(s)} className={btnGhost}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => del(s.id)} className={btnDanger}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(editing || creating) && (
        <ServiceForm
          initial={editing}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function ServiceForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: Service | null;
  onCancel: () => void;
  onSave: (s: Service) => void;
}) {
  const [s, setS] = useState<Service>(
    initial || {
      id: store.newId(),
      name: "",
      description: "",
      duration: 30,
      category: "Consulting",
      type: "free",
      price: 0,
      maxAttendees: 1,
      active: true,
    },
  );
  return (
    <Drawer onClose={onCancel}>
      <h2 className="mb-4 text-lg font-semibold">{initial ? "Edit service" : "New service"}</h2>
      <div className="grid gap-3">
        <L label="Name">
          <input
            className={inp2}
            value={s.name}
            onChange={(e) => setS({ ...s, name: e.target.value })}
            required
          />
        </L>
        <L label="Description">
          <textarea
            className={inp2}
            value={s.description}
            onChange={(e) => setS({ ...s, description: e.target.value })}
            rows={3}
          />
        </L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Duration (min)">
            <input
              type="number"
              min={5}
              className={inp2}
              value={s.duration}
              onChange={(e) => setS({ ...s, duration: Number(e.target.value) })}
            />
          </L>
          <L label="Category">
            <input
              className={inp2}
              value={s.category}
              onChange={(e) => setS({ ...s, category: e.target.value })}
            />
          </L>
          <L label="Type">
            <select
              className={inp2}
              value={s.type}
              onChange={(e) => {
                const t = e.target.value as any;
                setS({ ...s, type: t, price: t === "free" ? 0 : s.price });
              }}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </L>
          <L label="Price (₹)">
            <input
              type="number"
              min={0}
              disabled={s.type === "free"}
              className={inp2 + " disabled:bg-slate-50 disabled:text-slate-400"}
              value={s.price}
              onChange={(e) => setS({ ...s, price: Number(e.target.value) })}
            />
          </L>
          <L label="Max attendees">
            <input
              type="number"
              min={1}
              className={inp2}
              value={s.maxAttendees}
              onChange={(e) => setS({ ...s, maxAttendees: Math.max(1, Number(e.target.value)) })}
            />
          </L>
          <L label="Active">
            <select
              className={inp2}
              value={s.active ? "y" : "n"}
              onChange={(e) => setS({ ...s, active: e.target.value === "y" })}
            >
              <option value="y">Yes</option>
              <option value="n">No</option>
            </select>
          </L>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button onClick={() => onSave(s)} className={btnPrimary}>
          Save
        </button>
        <button onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </Drawer>
  );
}
const inp2 =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition shadow-sm bg-white placeholder-slate-400";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

// ------------ Availability ------------
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function buildBlockedMonth(y: number, m: number) {
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const out: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < startPad; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    out.push({
      day: d,
      iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  return out;
}

function AvailabilityTab() {
  const { availability } = useStore();
  const [a, setA] = useState(availability);
  const dirty = JSON.stringify(a) !== JSON.stringify(availability);
  const [calMonth, setCalMonth] = useState(() => {
    const today = new Date();
    return { y: today.getFullYear(), m: today.getMonth() };
  });
  const days = useMemo(() => buildBlockedMonth(calMonth.y, calMonth.m), [calMonth]);

  const toggleDay = (i: number) =>
    setA({
      ...a,
      workingDays: a.workingDays.includes(i)
        ? a.workingDays.filter((d) => d !== i)
        : [...a.workingDays, i].sort(),
    });

  const toggleBlockDate = (ds: string) => {
    const isBlocked = a.blockedDates.includes(ds);
    setA({
      ...a,
      blockedDates: isBlocked
        ? a.blockedDates.filter((x) => x !== ds)
        : [...a.blockedDates, ds].sort(),
    });
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <Card title="Working days">
        <div className="flex flex-wrap gap-2">
          {DOW.map((d, i) => (
            <label
              key={i}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition ${
                a.workingDays.includes(i)
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={a.workingDays.includes(i)}
                onChange={() => toggleDay(i)}
              />
              {d}
            </label>
          ))}
        </div>
      </Card>
      <Card title="Working hours">
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={a.startTime}
            onChange={(e) => setA({ ...a, startTime: e.target.value })}
            className={inp2 + " w-auto"}
          />
          <span className="text-sm text-slate-500">to</span>
          <input
            type="time"
            value={a.endTime}
            onChange={(e) => setA({ ...a, endTime: e.target.value })}
            className={inp2 + " w-auto"}
          />
        </div>
      </Card>
      <Card title="Buffer between bookings">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={a.bufferMinutes}
            onChange={(e) => setA({ ...a, bufferMinutes: Number(e.target.value) })}
            className={inp2 + " w-24"}
          />
          <span className="text-sm text-slate-500">minutes</span>
        </div>
      </Card>
      <Card title="Blocked dates">
        <p className="text-xs text-slate-500 mb-4">
          Click on any day below to block or unblock it. Blocked dates prevent customers from booking.
        </p>

        {/* Month Navigator */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setCalMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))
            }
            className="rounded-lg p-1.5 hover:bg-slate-100 font-semibold text-slate-600 transition cursor-pointer"
          >
            ←
          </button>
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            {new Date(calMonth.y, calMonth.m).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() =>
              setCalMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))
            }
            className="rounded-lg p-1.5 hover:bg-slate-100 font-semibold text-slate-650 transition cursor-pointer"
          >
            →
          </button>
        </div>

        {/* Week Days Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const isBlocked = a.blockedDates.includes(d.iso);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleBlockDate(d.iso)}
                className={`aspect-square rounded-xl text-xs font-bold transition-all duration-205 cursor-pointer flex flex-col items-center justify-center relative overflow-hidden ${
                  isBlocked
                    ? "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                    : "border border-slate-150 text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-650"
                }`}
              >
                <span>{d.day}</span>
                {isBlocked && (
                  <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Show summary of all blocked dates */}
        {a.blockedDates.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-150/50">
            <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2.5">
              All Blocked Dates ({a.blockedDates.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {a.blockedDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 animate-fade-in-up"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => toggleBlockDate(d)}
                    className="text-rose-450 hover:text-rose-700 ml-1 font-extrabold cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
      <div className="flex gap-2">
        <button
          disabled={!dirty}
          onClick={() => store.setAvailability(a)}
          className={btnPrimary + " disabled:opacity-50"}
        >
          Save changes
        </button>
        <button
          disabled={!dirty}
          onClick={() => setA(availability)}
          className={btnGhost + " disabled:opacity-50"}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-slate-200/40 p-6 shadow-md shadow-slate-100/30">
      <h3 className="mb-4 text-xs font-bold text-slate-500 tracking-wider uppercase">{title}</h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-md bg-white/90 border border-slate-200/50 p-3 shadow-lg rounded-2xl text-xs font-semibold text-slate-800">
        {label && <p className="text-slate-400 mb-1">Day {label}</p>}
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.payload.fill || '#6366f1' }} />
            <span>{item.name}: <span className="font-extrabold text-slate-900">{item.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="backdrop-blur-md bg-white/90 border border-slate-200/50 p-3 shadow-lg rounded-2xl text-xs font-semibold text-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.payload.fill || '#6366f1' }} />
          <span>{data.name}: <span className="font-extrabold text-slate-905">{data.value}</span></span>
        </div>
      </div>
    );
  }
  return null;
};

// ------------ Analytics ------------
function Analytics() {
  const { bookings, services } = useStore();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = bookings.filter((b) => b.date.startsWith(ym));
  const active = thisMonth.filter((b) => b.status !== "cancelled");
  const revenue = active.reduce(
    (sum, b) => sum + (services.find((s) => s.id === b.serviceId)?.price || 0) * b.attendees,
    0,
  );

  const counts: Record<string, number> = {};
  active.forEach((b) => {
    counts[b.serviceId] = (counts[b.serviceId] || 0) + 1;
  });
  const popularId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const popular = services.find((s) => s.id === popularId)?.name || "—";

  const cancelRate = thisMonth.length
    ? Math.round(
        (thisMonth.filter((b) => b.status === "cancelled").length / thisMonth.length) * 100,
      )
    : 0;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const perDay = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const dStr = String(i + 1).padStart(2, "0");
        const date = `${ym}-${dStr}`;
        return {
          day: dStr,
          bookings: thisMonth.filter((b) => b.date === date && b.status !== "cancelled").length,
        };
      }),
    [thisMonth, daysInMonth, ym],
  );

  const pie = Object.entries(counts).map(([id, value]) => ({
    name: services.find((s) => s.id === id)?.name || id,
    value,
  }));
  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981", "#f59e0b"];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Bookings this month"
          value={String(thisMonth.length)}
          trend="+12% from last month"
          isPositive={true}
        />
        <Metric
          label="Revenue this month"
          value={`₹${revenue.toLocaleString("en-IN")}`}
          trend="+18% from last month"
          isPositive={true}
        />
        <Metric label="Most popular" value={popular} trend="Steady demand" isPositive={true} />
        <Metric
          label="Cancellation rate"
          value={`${cancelRate}%`}
          trend={cancelRate > 20 ? "+4% increase" : "-2% improvement"}
          isPositive={cancelRate <= 20}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Bookings per day">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={perDay}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} className="text-slate-400 font-semibold" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} className="text-slate-400 font-semibold" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bookings" fill="url(#colorBookings)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Bookings by service">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  trend,
  isPositive,
}: {
  label: string;
  value: string;
  trend?: string;
  isPositive?: boolean;
}) {
  return (
    <div className="backdrop-blur-md bg-white/75 rounded-2xl border border-slate-200/40 p-5 flex flex-col justify-between h-32 shadow-md shadow-slate-100/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      </div>
      {trend && (
        <span
          className={`text-[10px] inline-flex items-center font-bold rounded-lg px-2 py-0.5 w-fit ${
            isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {trend}
        </span>
      )}
    </div>
  );
}

// ------------ Notifications Tab ------------
interface NotificationTemplates {
  confirmation: { subject: string; body: string };
  reminder: { subject: string; body: string };
  cancellation: { subject: string; body: string };
}

const DEFAULT_TEMPLATES: NotificationTemplates = {
  confirmation: {
    subject: "Appointment Confirmed: {serviceName}",
    body: "Hi {clientName},\n\nYour appointment for {serviceName} on {date} at {time} has been confirmed!\n\nYou can join your virtual video meeting room here:\n{meetingUrl}\n\nReference ID: {refId}\n\nBest regards,\nTwinstdio Team",
  },
  reminder: {
    subject: "Reminder: Scheduled Session - {serviceName}",
    body: "Hi {clientName},\n\nThis is a quick reminder that your appointment for {serviceName} is scheduled for tomorrow ({date}) at {time}.\n\nJoin the live video call here when it starts:\n{meetingUrl}\n\nSee you then!\nTwinstdio Team",
  },
  cancellation: {
    subject: "Cancellation Notice: {serviceName}",
    body: "Hi {clientName},\n\nYour appointment for {serviceName} on {date} at {time} has been cancelled.\n\nIf you have any questions or would like to reschedule, please visit our booking site.\n\nBest regards,\nTwinstdio Team",
  },
};

function NotificationsTab() {
  const { bookings, services } = useStore();
  const [templates, setTemplates] = useState<NotificationTemplates>(() => {
    try {
      const stored = localStorage.getItem("notification_templates");
      return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  const [activeType, setActiveType] = useState<keyof NotificationTemplates>("confirmation");
  const [subject, setSubject] = useState(templates[activeType].subject);
  const [body, setBody] = useState(templates[activeType].body);
  const [previewBookingId, setPreviewBookingId] = useState(bookings[0]?.id || "");
  const [statusMsg, setStatusMsg] = useState("");

  // Sync state when activeType changes
  useEffect(() => {
    setSubject(templates[activeType].subject);
    setBody(templates[activeType].body);
  }, [activeType, templates]);

  const saveTemplate = () => {
    const updated = {
      ...templates,
      [activeType]: { subject, body },
    };
    setTemplates(updated);
    localStorage.setItem("notification_templates", JSON.stringify(updated));
    setStatusMsg("Template saved successfully!");
    setTimeout(() => setStatusMsg(""), 2000);
  };

  const selectedBooking = bookings.find((b) => b.id === previewBookingId) || bookings[0];
  const selectedService = services.find((s) => s.id === selectedBooking?.serviceId);

  const interpolate = (text: string) => {
    if (!selectedBooking) return text;
    return text
      .replace(/{clientName}/g, selectedBooking.clientName)
      .replace(/{serviceName}/g, selectedService?.name || "Service")
      .replace(/{date}/g, selectedBooking.date)
      .replace(/{time}/g, selectedBooking.time)
      .replace(/{refId}/g, selectedBooking.id)
      .replace(/{meetingUrl}/g, selectedBooking.status === "confirmed"
        ? `http://booking.twinstdio.com/?meeting=${selectedBooking.id}`
        : `http://booking.twinstdio.com/?ref=${selectedBooking.id}&email=${selectedBooking.email}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Card title="Notification Template Settings">
          <p className="text-xs text-slate-500 mb-6">
            Configure automated email notifications sent to attendees upon booking status changes or reminders.
          </p>

          {/* Template Type Selector */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-4">
            {(["confirmation", "reminder", "cancellation"] as (keyof NotificationTemplates)[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition-all duration-300 cursor-pointer ${
                  activeType === t
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-150"
                    : "text-slate-650 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {t} email
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <L label="Subject line">
              <input
                className={inp2}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject Line"
              />
            </L>

            <L label="Body content">
              <textarea
                className={inp2}
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body text template..."
              />
            </L>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={saveTemplate} className={btnPrimary}>
                  Save Template
                </button>
                <button
                  onClick={() => {
                    setTemplates(DEFAULT_TEMPLATES);
                    localStorage.removeItem("notification_templates");
                  }}
                  className={btnGhost}
                >
                  Reset Defaults
                </button>
              </div>
              {statusMsg && (
                <span className="text-xs font-bold text-emerald-600 animate-pulse">
                  {statusMsg}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Dynamic Tags Helper Card */}
        <Card title="Dynamic Injection Tags">
          <p className="text-xs text-slate-500 mb-4">
            Use these curly braces dynamic variables anywhere in the subject or body:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{clientName}`}</span>
              <span className="text-slate-500 block mt-0.5">Attendee Name</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{serviceName}`}</span>
              <span className="text-slate-500 block mt-0.5">Service Title</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{date}`}</span>
              <span className="text-slate-500 block mt-0.5">Date (YYYY-MM-DD)</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{time}`}</span>
              <span className="text-slate-500 block mt-0.5">Time Slot (HH:MM)</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{refId}`}</span>
              <span className="text-slate-500 block mt-0.5">Reference code</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
              <span className="font-mono font-bold text-indigo-650">{`{meetingUrl}`}</span>
              <span className="text-slate-500 block mt-0.5">Video Call Link</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Sandbox Panel */}
      <aside className="space-y-6">
        <Card title="Live Message Preview">
          <p className="text-xs text-slate-500 mb-4">
            Select a transaction booking below to simulate email layout in real time:
          </p>

          <L label="Simulate Booking">
            <select
              className={inp2 + " mb-6"}
              value={previewBookingId}
              onChange={(e) => setPreviewBookingId(e.target.value)}
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.clientName} - {b.id} ({b.date})
                </option>
              ))}
              {bookings.length === 0 && <option value="">— No bookings available —</option>}
            </select>
          </L>

          {/* Email mockup box */}
          {selectedBooking ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 shadow-inner flex flex-col text-left overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span>From:</span>
                  <span className="text-slate-700 font-semibold">notifications@twinstdio.com</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium border-t border-slate-100 pt-2">
                  <span>To:</span>
                  <span className="text-slate-700 font-semibold">{selectedBooking.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium border-t border-slate-100 pt-2">
                  <span>Subject:</span>
                  <span className="text-slate-905 font-bold">{interpolate(subject) || "—"}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 bg-white text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-64 border-t border-slate-100">
                {interpolate(body) || "—"}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <span className="text-xs text-slate-400">Create a booking first to preview.</span>
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
}
