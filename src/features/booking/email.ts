// EmailJS integration — loaded from CDN.
// Replace these with your real EmailJS values:
const EMAILJS_SERVICE_ID = "YOUR_EMAILJS_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_EMAILJS_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";

let loading: Promise<void> | null = null;
function loadEmailJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).emailjs) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = () => {
      try {
        (window as any).emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

export async function sendBookingEmail(kind: "confirmation" | "cancellation", payload: {
  clientName: string; email: string; service: string; date: string; time: string; referenceId: string;
}) {
  try {
    await loadEmailJs();
    await (window as any).emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      kind,
      to_email: payload.email,
      client_name: payload.clientName,
      service: payload.service,
      date: payload.date,
      time: payload.time,
      reference_id: payload.referenceId,
    });
  } catch (err) {
    console.warn("[email] send failed (non-blocking):", err);
  }
}
