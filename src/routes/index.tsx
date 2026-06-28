import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  store,
  useStore,
  getSlots,
  type Service,
  type Booking,
} from "@/features/booking/store";
import { sendBookingEmail } from "@/features/booking/email";
import { openRazorpay } from "@/features/booking/razorpay";
import { downloadIcs } from "@/features/booking/ics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book a Session" },
      { name: "description", content: "Browse services and book a time that works for you." },
    ],
  }),
  component: PublicPage,
});

type Step = "browse" | "datetime" | "details" | "payment" | "confirm";

function PublicPage() {
  const { services } = useStore();
  const [view, setView] = useState<"book" | "manage">("book");
  const [step, setStep] = useState<Step>("browse");
  const [selected, setSelected] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", attendees: 1, notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payError, setPayError] = useState("");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "free" | "paid">("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const activeServices = services.filter((s) => s.active);
  const categories = Array.from(new Set(activeServices.map((s) => s.category)));
  const filtered = activeServices.filter(
    (s) =>
      (typeFilter === "all" || s.type === typeFilter) &&
      (catFilter === "all" || s.category === catFilter),
  );

  const reset = () => {
    setStep("browse");
    setSelected(null);
    setDate("");
    setTime("");
    setForm({ name: "", email: "", phone: "", attendees: 1, notes: "" });
    setErrors({});
    setPayError("");
    setReschedulingId(null);
  };

  const startBooking = (s: Service) => {
    setSelected(s);
    setForm((f) => ({ ...f, attendees: 1 }));
    setStep("datetime");
  };

  const submitDetails = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (form.attendees < 1 || form.attendees > (selected?.maxAttendees ?? 1))
      e.attendees = `1 to ${selected?.maxAttendees}`;
    setErrors(e);
    if (Object.keys(e).length) return;
    if (selected?.type === "paid") setStep("payment");
    else finalize();
  };

  const finalize = (paid = false) => {
    if (!selected) return;
    const s = store.get();
    if (reschedulingId) {
      const updated = s.bookings.map((b) =>
        b.id === reschedulingId ? { ...b, date, time, attendees: form.attendees, status: "confirmed" as const } : b,
      );
      store.setBookings(updated);
      const b = updated.find((x) => x.id === reschedulingId)!;
      sendBookingEmail("confirmation", { clientName: b.clientName, email: b.email, service: selected.name, date, time, referenceId: b.id });
      setConfirmed(b);
    } else {
      const b: Booking = {
        id: store.newId(),
        serviceId: selected.id,
        date, time,
        attendees: form.attendees,
        clientName: form.name,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
        status: selected.type === "free" ? "confirmed" : paid ? "confirmed" : "pending",
        payment: selected.type === "free" ? "free" : "paid",
        createdAt: new Date().toISOString(),
      };
      store.setBookings([...s.bookings, b]);
      sendBookingEmail("confirmation", { clientName: b.clientName, email: b.email, service: selected.name, date, time, referenceId: b.id });
      setConfirmed(b);
    }
    setStep("confirm");
  };

  const pay = () => {
    if (!selected) return;
    setPayError("");
    openRazorpay({
      amountInr: selected.price * form.attendees,
      name: selected.name,
      description: `${form.attendees} × ${selected.name}`,
      prefill: { name: form.name, email: form.email, contact: form.phone },
      onSuccess: () => finalize(true),
      onFailure: (m) => setPayError(m),
    });
  };

  // --- Reschedule flow ---
  const [lookup, setLookup] = useState({ ref: "", email: "" });
  const [lookupErr, setLookupErr] = useState("");
  const [foundBooking, setFoundBooking] = useState<Booking | null>(null);

  const doLookup = () => {
    const b = store.get().bookings.find(
      (x) => x.id.toUpperCase() === lookup.ref.trim().toUpperCase() && x.email.toLowerCase() === lookup.email.trim().toLowerCase(),
    );
    if (!b) { setLookupErr("No booking found with those details."); setFoundBooking(null); return; }
    setLookupErr(""); setFoundBooking(b);
  };

  const startReschedule = (b: Booking) => {
    const svc = store.get().services.find((s) => s.id === b.serviceId);
    if (!svc) return;
    setSelected(svc);
    setForm({ name: b.clientName, email: b.email, phone: b.phone, attendees: b.attendees, notes: b.notes || "" });
    setReschedulingId(b.id);
    setView("book");
    setStep("datetime");
  };

  const cancelBooking = (b: Booking) => {
    const updated = store.get().bookings.map((x) => x.id === b.id ? { ...x, status: "cancelled" as const } : x);
    store.setBookings(updated);
    const svc = store.get().services.find((s) => s.id === b.serviceId);
    sendBookingEmail("cancellation", { clientName: b.clientName, email: b.email, service: svc?.name || "", date: b.date, time: b.time, referenceId: b.id });
    setFoundBooking({ ...b, status: "cancelled" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header view={view} onView={(v) => { setView(v); reset(); setFoundBooking(null); }} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {view === "book" ? (
          <>
            <Stepper step={step} hasPayment={selected?.type === "paid"} />
            {step === "browse" && (
              <Browse
                services={filtered}
                categories={categories}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                catFilter={catFilter} setCatFilter={setCatFilter}
                onPick={startBooking}
              />
            )}
            {step === "datetime" && selected && (
              <DateTimeStep
                service={selected}
                date={date} setDate={setDate}
                time={time} setTime={setTime}
                onBack={() => setStep("browse")}
                onNext={() => setStep("details")}
              />
            )}
            {step === "details" && selected && (
              <DetailsStep
                service={selected}
                form={form} setForm={setForm} errors={errors}
                onBack={() => setStep("datetime")}
                onNext={submitDetails}
              />
            )}
            {step === "payment" && selected && (
              <PaymentStep
                service={selected} attendees={form.attendees} date={date} time={time}
                onBack={() => setStep("details")}
                onPay={pay} error={payError}
              />
            )}
            {step === "confirm" && confirmed && selected && (
              <ConfirmStep booking={confirmed} service={selected} onNew={reset} onManage={() => { setView("manage"); setLookup({ ref: confirmed.id, email: confirmed.email }); }} />
            )}
          </>
        ) : (
          <ManageBooking
            lookup={lookup} setLookup={setLookup} onLookup={doLookup}
            err={lookupErr} booking={foundBooking}
            onReschedule={startReschedule} onCancel={cancelBooking}
          />
        )}
      </main>
    </div>
  );
}

function Header({ view, onView }: { view: "book" | "manage"; onView: (v: "book" | "manage") => void }) {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <button onClick={() => onView("book")} className="text-lg font-semibold tracking-tight">
          <span className="text-indigo-600">●</span> Bookly
        </button>
        <nav className="flex items-center gap-2 text-sm">
          <button onClick={() => onView("book")} className={navCls(view === "book")}>Book</button>
          <button onClick={() => onView("manage")} className={navCls(view === "manage")}>Manage my booking</button>
          <Link to="/admin" className="rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
const navCls = (active: boolean) =>
  `rounded-md px-3 py-1.5 ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900"}`;

function Stepper({ step, hasPayment }: { step: Step; hasPayment: boolean }) {
  const steps: { id: Step; label: string }[] = [
    { id: "browse", label: "Service" },
    { id: "datetime", label: "Date & time" },
    { id: "details", label: "Details" },
    ...(hasPayment ? [{ id: "payment" as Step, label: "Payment" }] : []),
    { id: "confirm", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i <= idx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
          <span className={i <= idx ? "text-slate-900" : "text-slate-500"}>{s.label}</span>
          {i < steps.length - 1 && <span className="mx-1 text-slate-300">→</span>}
        </li>
      ))}
    </ol>
  );
}

function Browse(props: {
  services: Service[]; categories: string[];
  typeFilter: "all" | "free" | "paid"; setTypeFilter: (v: any) => void;
  catFilter: string; setCatFilter: (v: string) => void;
  onPick: (s: Service) => void;
}) {
  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Choose a service</h1>
      <p className="mb-6 text-sm text-slate-600">Pick what you'd like to book.</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <Select value={props.typeFilter} onChange={(v) => props.setTypeFilter(v)} options={[["all","All types"],["free","Free"],["paid","Paid"]]} />
        <Select value={props.catFilter} onChange={props.setCatFilter} options={[["all","All categories"], ...props.categories.map<[string,string]>((c) => [c, c])]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {props.services.map((s) => (
          <button key={s.id} onClick={() => props.onPick(s)} className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-indigo-300 hover:shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.category}</span>
              <Badge type={s.type === "free" ? "free" : "paid"}>{s.type === "free" ? "Free" : `₹${s.price}`}</Badge>
            </div>
            <h3 className="text-lg font-semibold group-hover:text-indigo-700">{s.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.description}</p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{s.duration} min</span>
              <span>Up to {s.maxAttendees}</span>
            </div>
          </button>
        ))}
        {props.services.length === 0 && <p className="text-sm text-slate-500">No services match your filters.</p>}
      </div>
    </section>
  );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Badge({ type, children }: { type: "free" | "paid" | "active" | "inactive" | "pending" | "confirmed" | "cancelled"; children: React.ReactNode }) {
  const cls = {
    free: "bg-emerald-50 text-emerald-700",
    paid: "bg-indigo-50 text-indigo-700",
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600",
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-rose-50 text-rose-700",
  }[type];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function DateTimeStep({ service, date, setDate, time, setTime, onBack, onNext }: { service: Service; date: string; setDate: (s: string) => void; time: string; setTime: (s: string) => void; onBack: () => void; onNext: () => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const days = useMemo(() => buildMonth(month.y, month.m), [month]);
  const slots = useMemo(() => date ? getSlots(date, service) : [], [date, service]);
  const av = store.get().availability;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Pick a date & time</h1>
      <p className="mb-6 text-sm text-slate-600">{service.name} · {service.duration} min</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100">←</button>
            <span className="text-sm font-medium">{new Date(month.y, month.m).toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
            <button onClick={() => setMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const ds = d.iso;
              const dow = new Date(ds + "T00:00:00").getDay();
              const isPast = ds < todayStr;
              const isBlocked = av.blockedDates.includes(ds);
              const isWorking = av.workingDays.includes(dow);
              const disabled = isPast || isBlocked || !isWorking;
              const selected = ds === date;
              return (
                <button key={i} disabled={disabled} onClick={() => { setDate(ds); setTime(""); }}
                  className={`aspect-square rounded-md text-sm transition ${selected ? "bg-indigo-600 text-white" : disabled ? "text-slate-300" : "hover:bg-indigo-50 text-slate-700"}`}>
                  {d.day}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-medium">Available times</h3>
          {!date && <p className="text-sm text-slate-500">Select a date to see times.</p>}
          {date && slots.length === 0 && <p className="text-sm text-slate-500">No availability on this day.</p>}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button key={s.time} disabled={s.full} onClick={() => setTime(s.time)}
                className={`rounded-md border px-2 py-2 text-sm ${time === s.time ? "border-indigo-600 bg-indigo-600 text-white" : s.full ? "cursor-not-allowed border-slate-100 text-slate-300" : "border-slate-200 hover:border-indigo-300"}`}>
                {s.time}{s.full && <span className="ml-1 text-[10px]">full</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Actions onBack={onBack} onNext={onNext} nextDisabled={!date || !time} />
    </section>
  );
}

function buildMonth(y: number, m: number) {
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const out: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < startPad; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    out.push({ day: d, iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  return out;
}

function DetailsStep({ service, form, setForm, errors, onBack, onNext }: any) {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your details</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email" error={errors.email}><input type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone" error={errors.phone}><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={`Attendees (1–${service.maxAttendees})`} error={errors.attendees}>
          <input type="number" min={1} max={service.maxAttendees} className={inp} value={form.attendees} onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)"><textarea className={inp} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </div>
      <Actions onBack={onBack} onNext={onNext} nextLabel={service.type === "paid" ? "Continue to payment" : "Confirm booking"} />
    </section>
  );
}
const inp = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function PaymentStep({ service, attendees, date, time, onBack, onPay, error }: any) {
  const total = service.price * attendees;
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Review & pay</h1>
      <div className="rounded-xl border border-slate-200 p-5">
        <Row k="Service" v={service.name} />
        <Row k="Date" v={date} />
        <Row k="Time" v={time} />
        <Row k="Attendees" v={String(attendees)} />
        <div className="my-3 border-t border-slate-100" />
        <Row k="Total" v={`₹${total}`} bold />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <Actions onBack={onBack} onNext={onPay} nextLabel={`Pay ₹${total}`} />
    </section>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className="flex justify-between py-1 text-sm"><span className="text-slate-500">{k}</span><span className={bold ? "font-semibold" : ""}>{v}</span></div>;
}

function ConfirmStep({ booking, service, onNew, onManage }: { booking: Booking; service: Service; onNew: () => void; onManage: () => void }) {
  return (
    <section className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-2xl">✓</div>
      <h1 className="text-2xl font-semibold tracking-tight">You're booked!</h1>
      <p className="mt-1 text-sm text-slate-600">A confirmation email is on its way.</p>
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 p-5 text-left">
        <Row k="Reference" v={booking.id} bold />
        <Row k="Service" v={service.name} />
        <Row k="Date" v={booking.date} />
        <Row k="Time" v={booking.time} />
        <Row k="Attendees" v={String(booking.attendees)} />
        <Row k="Name" v={booking.clientName} />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={() => downloadIcs({ title: service.name, description: booking.notes || "", date: booking.date, time: booking.time, durationMin: service.duration, referenceId: booking.id })} className={btnPrimary}>Add to calendar</button>
        <button onClick={onManage} className={btnGhost}>Reschedule or cancel</button>
        <button onClick={onNew} className={btnGhost}>Book another</button>
      </div>
    </section>
  );
}

function ManageBooking({ lookup, setLookup, onLookup, err, booking, onReschedule, onCancel }: any) {
  const svc = booking ? store.get().services.find((s) => s.id === booking.serviceId) : null;
  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Manage your booking</h1>
      <p className="mb-6 text-sm text-slate-600">Enter your reference ID and email.</p>
      <div className="grid max-w-md gap-3">
        <Field label="Reference ID"><input className={inp} value={lookup.ref} onChange={(e: any) => setLookup({ ...lookup, ref: e.target.value })} /></Field>
        <Field label="Email"><input className={inp} value={lookup.email} onChange={(e: any) => setLookup({ ...lookup, email: e.target.value })} /></Field>
        <button onClick={onLookup} className={btnPrimary + " self-start"}>Find booking</button>
        {err && <p className="text-sm text-rose-600">{err}</p>}
      </div>
      {booking && svc && (
        <div className="mt-8 max-w-md rounded-xl border border-slate-200 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{svc.name}</h3>
            <Badge type={booking.status}>{booking.status}</Badge>
          </div>
          <Row k="Reference" v={booking.id} />
          <Row k="Date" v={booking.date} />
          <Row k="Time" v={booking.time} />
          <Row k="Attendees" v={String(booking.attendees)} />
          {booking.status !== "cancelled" && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => onReschedule(booking)} className={btnPrimary}>Reschedule</button>
              <button onClick={() => onCancel(booking)} className={btnDanger}>Cancel booking</button>
            </div>
          )}
          {booking.status === "cancelled" && <p className="mt-3 text-sm text-rose-600">This booking has been cancelled.</p>}
        </div>
      )}
    </section>
  );
}

function Actions({ onBack, onNext, nextLabel = "Continue", nextDisabled }: { onBack: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-8 flex justify-between">
      <button onClick={onBack} className={btnGhost}>← Back</button>
      <button onClick={onNext} disabled={nextDisabled} className={btnPrimary + " disabled:cursor-not-allowed disabled:opacity-50"}>{nextLabel}</button>
    </div>
  );
}

export const btnPrimary = "inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700";
export const btnGhost = "inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
export const btnDanger = "inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700";
