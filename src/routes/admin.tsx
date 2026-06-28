import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  store, useStore, type Service, type Booking, type BookingStatus,
} from "@/features/booking/store";
import { sendBookingEmail } from "@/features/booking/email";
import { btnPrimary, btnGhost, btnDanger } from "./index";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  return <Panel onLogout={() => setAuthed(false)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (u === "admin" && p === "admin123") onOk(); else setErr("Invalid credentials"); }}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Admin sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Use admin / admin123</p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Username</span>
          <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={u} onChange={(e) => setU(e.target.value)} />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
          <input type="password" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        {err && <p className="mb-3 text-sm text-rose-600">{err}</p>}
        <button className={btnPrimary + " w-full"}>Sign in</button>
        <Link to="/" className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-700">← Back to site</Link>
      </form>
    </div>
  );
}

type Tab = "dashboard" | "services" | "availability" | "analytics";

function Panel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold"><span className="text-indigo-600">●</span> Admin</span>
            <nav className="flex gap-1 text-sm">
              {(["dashboard","services","availability","analytics"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 capitalize ${tab === t ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}>{t}</button>
              ))}
            </nav>
          </div>
          <div className="flex gap-2 text-sm">
            <Link to="/" className="rounded-md px-3 py-1.5 text-slate-600 hover:text-slate-900">View site</Link>
            <button onClick={onLogout} className={btnGhost}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "dashboard" && <Dashboard />}
        {tab === "services" && <Services />}
        {tab === "availability" && <AvailabilityTab />}
        {tab === "analytics" && <Analytics />}
      </main>
    </div>
  );
}

// ------------ Dashboard ------------
function Dashboard() {
  const { bookings, services } = useStore();
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);

  const filtered = bookings
    .filter((b) => status === "all" || b.status === status)
    .filter((b) => (!from || b.date >= from) && (!to || b.date <= to))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const svcName = (id: string) => services.find((s) => s.id === id)?.name || "—";

  const setStatusOf = (b: Booking, s: BookingStatus) => {
    const updated = store.get().bookings.map((x) => x.id === b.id ? { ...x, status: s } : x);
    store.setBookings(updated);
    setSelected({ ...b, status: s });
    if (s === "cancelled") {
      sendBookingEmail("cancellation", { clientName: b.clientName, email: b.email, service: svcName(b.serviceId), date: b.date, time: b.time, referenceId: b.id });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th></tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} onClick={() => setSelected(b)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{b.clientName}</td>
                  <td className="px-4 py-3">{svcName(b.serviceId)}</td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.time}</td>
                  <td className="px-4 py-3"><StatusBadge s={b.status} /></td>
                  <td className="px-4 py-3 capitalize">{b.payment}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No bookings.</td></tr>}
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
          {selected.notes && <Detail k="Notes" v={selected.notes} />}
          <div className="mt-6 flex gap-2">
            {selected.status !== "confirmed" && <button onClick={() => setStatusOf(selected, "confirmed")} className={btnPrimary}>Confirm</button>}
            {selected.status !== "cancelled" && <button onClick={() => setStatusOf(selected, "cancelled")} className={btnDanger}>Cancel</button>}
          </div>
        </Drawer>
      )}
    </div>
  );
}

function StatusBadge({ s }: { s: BookingStatus }) {
  const cls = { pending: "bg-amber-50 text-amber-700", confirmed: "bg-emerald-50 text-emerald-700", cancelled: "bg-rose-50 text-rose-700" }[s];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s}</span>;
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="text-right">{v}</span></div>;
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-900/30" onClick={onClose} />
      <div className="w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <button onClick={onClose} className="mb-4 text-sm text-slate-500 hover:text-slate-900">✕ Close</button>
        {children}
      </div>
    </div>
  );
}

function MiniCalendar({ bookings }: { bookings: Booking[] }) {
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  const hasBooking = (d: number) => bookings.some((b) => b.date === `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` && b.status !== "cancelled");
  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium">{new Date(y, m).toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">{["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}</div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className="aspect-square rounded-md text-center text-xs">
            {d && <div className="flex h-full flex-col items-center justify-center">{d}{hasBooking(d) && <span className="mt-0.5 h-1 w-1 rounded-full bg-indigo-600" />}</div>}
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
    store.setServices(exists ? store.get().services.map((x) => x.id === s.id ? s : x) : [...store.get().services, s]);
    setEditing(null); setCreating(false);
  };
  const del = (id: string) => store.setServices(store.get().services.filter((s) => s.id !== id));
  const toggle = (s: Service) => save({ ...s, active: !s.active });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <button onClick={() => setCreating(true)} className={btnPrimary}>+ New service</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">{s.category}</span>
              <div className="flex gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.type === "free" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>{s.type === "free" ? "Free" : `₹${s.price}`}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <h3 className="text-base font-semibold">{s.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.description}</p>
            <div className="mt-3 text-xs text-slate-500">{s.duration} min · up to {s.maxAttendees}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setEditing(s)} className={btnGhost}>Edit</button>
              <button onClick={() => toggle(s)} className={btnGhost}>{s.active ? "Deactivate" : "Activate"}</button>
              <button onClick={() => del(s.id)} className={btnDanger}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {(editing || creating) && (
        <ServiceForm initial={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}
    </div>
  );
}

function ServiceForm({ initial, onCancel, onSave }: { initial: Service | null; onCancel: () => void; onSave: (s: Service) => void }) {
  const [s, setS] = useState<Service>(initial || {
    id: store.newId(), name: "", description: "", duration: 30, category: "Consulting", type: "free", price: 0, maxAttendees: 1, active: true,
  });
  return (
    <Drawer onClose={onCancel}>
      <h2 className="mb-4 text-lg font-semibold">{initial ? "Edit service" : "New service"}</h2>
      <div className="grid gap-3">
        <L label="Name"><input className={inp2} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></L>
        <L label="Description"><textarea className={inp2} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Duration (min)"><input type="number" min={5} className={inp2} value={s.duration} onChange={(e) => setS({ ...s, duration: Number(e.target.value) })} /></L>
          <L label="Category"><input className={inp2} value={s.category} onChange={(e) => setS({ ...s, category: e.target.value })} /></L>
          <L label="Type">
            <select className={inp2} value={s.type} onChange={(e) => setS({ ...s, type: e.target.value as any })}>
              <option value="free">Free</option><option value="paid">Paid</option>
            </select>
          </L>
          <L label="Price (₹)"><input type="number" min={0} disabled={s.type === "free"} className={inp2 + " disabled:bg-slate-50"} value={s.price} onChange={(e) => setS({ ...s, price: Number(e.target.value) })} /></L>
          <L label="Max attendees"><input type="number" min={1} className={inp2} value={s.maxAttendees} onChange={(e) => setS({ ...s, maxAttendees: Math.max(1, Number(e.target.value)) })} /></L>
          <L label="Active"><select className={inp2} value={s.active ? "y" : "n"} onChange={(e) => setS({ ...s, active: e.target.value === "y" })}><option value="y">Yes</option><option value="n">No</option></select></L>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button onClick={() => onSave(s)} className={btnPrimary}>Save</button>
        <button onClick={onCancel} className={btnGhost}>Cancel</button>
      </div>
    </Drawer>
  );
}
const inp2 = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}

// ------------ Availability ------------
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function AvailabilityTab() {
  const { availability } = useStore();
  const [a, setA] = useState(availability);
  const [block, setBlock] = useState("");
  const dirty = JSON.stringify(a) !== JSON.stringify(availability);

  const toggleDay = (i: number) => setA({ ...a, workingDays: a.workingDays.includes(i) ? a.workingDays.filter((d) => d !== i) : [...a.workingDays, i].sort() });
  const addBlock = () => { if (block && !a.blockedDates.includes(block)) setA({ ...a, blockedDates: [...a.blockedDates, block].sort() }); setBlock(""); };
  const removeBlock = (d: string) => setA({ ...a, blockedDates: a.blockedDates.filter((x) => x !== d) });

  return (
    <div className="grid max-w-2xl gap-6">
      <Card title="Working days">
        <div className="flex flex-wrap gap-2">
          {DOW.map((d, i) => (
            <label key={i} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${a.workingDays.includes(i) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}>
              <input type="checkbox" className="sr-only" checked={a.workingDays.includes(i)} onChange={() => toggleDay(i)} />{d}
            </label>
          ))}
        </div>
      </Card>
      <Card title="Working hours">
        <div className="flex items-center gap-3">
          <input type="time" value={a.startTime} onChange={(e) => setA({ ...a, startTime: e.target.value })} className={inp2 + " w-auto"} />
          <span className="text-sm text-slate-500">to</span>
          <input type="time" value={a.endTime} onChange={(e) => setA({ ...a, endTime: e.target.value })} className={inp2 + " w-auto"} />
        </div>
      </Card>
      <Card title="Buffer between bookings">
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={a.bufferMinutes} onChange={(e) => setA({ ...a, bufferMinutes: Number(e.target.value) })} className={inp2 + " w-24"} />
          <span className="text-sm text-slate-500">minutes</span>
        </div>
      </Card>
      <Card title="Blocked dates">
        <div className="flex gap-2">
          <input type="date" value={block} onChange={(e) => setBlock(e.target.value)} className={inp2 + " w-auto"} />
          <button onClick={addBlock} className={btnGhost}>Add</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {a.blockedDates.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">
              {d}<button onClick={() => removeBlock(d)} className="text-rose-500 hover:text-rose-700">×</button>
            </span>
          ))}
          {a.blockedDates.length === 0 && <span className="text-xs text-slate-500">No blocked dates.</span>}
        </div>
      </Card>
      <div className="flex gap-2">
        <button disabled={!dirty} onClick={() => store.setAvailability(a)} className={btnPrimary + " disabled:opacity-50"}>Save changes</button>
        <button disabled={!dirty} onClick={() => setA(availability)} className={btnGhost + " disabled:opacity-50"}>Reset</button>
      </div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="mb-3 text-sm font-semibold">{title}</h3>{children}</div>;
}

// ------------ Analytics ------------
function Analytics() {
  const { bookings, services } = useStore();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = bookings.filter((b) => b.date.startsWith(ym));
  const active = thisMonth.filter((b) => b.status !== "cancelled");
  const revenue = active.reduce((sum, b) => sum + (services.find((s) => s.id === b.serviceId)?.price || 0) * b.attendees, 0);

  const counts: Record<string, number> = {};
  active.forEach((b) => { counts[b.serviceId] = (counts[b.serviceId] || 0) + 1; });
  const popularId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const popular = services.find((s) => s.id === popularId)?.name || "—";

  const cancelRate = thisMonth.length ? Math.round((thisMonth.filter((b) => b.status === "cancelled").length / thisMonth.length) * 100) : 0;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const perDay = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    const date = `${ym}-${d}`;
    return { day: d, bookings: thisMonth.filter((b) => b.date === date && b.status !== "cancelled").length };
  }), [thisMonth, daysInMonth, ym]);

  const pie = Object.entries(counts).map(([id, value]) => ({ name: services.find((s) => s.id === id)?.name || id, value }));
  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981", "#f59e0b"];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Bookings this month" value={String(thisMonth.length)} />
        <Metric label="Revenue this month" value={`₹${revenue.toLocaleString("en-IN")}`} />
        <Metric label="Most popular" value={popular} />
        <Metric label="Cancellation rate" value={`${cancelRate}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Bookings per day">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={perDay}>
                <XAxis dataKey="day" tickLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Bookings by service">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
