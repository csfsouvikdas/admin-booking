// Frontend proxy for sending booking emails via the Express backend server.
// Prevents exposing EmailJS private keys or configurations on the client.

export async function sendBookingEmail(
  kind: "confirmation" | "cancellation",
  payload: {
    clientName: string;
    email: string;
    service: string;
    date: string;
    time: string;
    referenceId: string;
  },
) {
  try {
    const res = await fetch("https://appointment-api.twinstdio.com/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    });
    if (!res.ok) {
      console.warn("[email] backend proxy email dispatch failed:", res.status);
    }
  } catch (err) {
    console.warn("[email] proxy send call failed (non-blocking):", err);
  }
}
