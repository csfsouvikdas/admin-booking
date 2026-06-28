// Razorpay checkout helper with mock sandbox fallback simulation.
// Automatically falls back to client-side checkout without order_id if the backend order fails.

export const RAZORPAY_KEY_ID = "rzp_test_REPLACEME";

let loading: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

const randStr = (n = 14) => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
};

export async function openRazorpay(opts: {
  amountInr: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  onSuccess: (paymentDetails: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure: (msg: string) => void;
}) {
  try {
    // 1. Fetch Razorpay Order from the Backend
    const orderRes = await fetch("https://appointment-api.twinstdio.com/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountInr: opts.amountInr }),
    });

    if (!orderRes.ok) {
      throw new Error("Could not create payment order on backend");
    }

    const orderData = await orderRes.json();

    // If backend returned a mock order (due to Key Secret validation failure),
    // open the real Razorpay widget without the order_id parameter
    if (orderData.isMock) {
      console.log(
        "[razorpay] falling back to client-side checkout to render the real payment popup.",
      );
      await loadRazorpay();

      const rp = new (window as any).Razorpay({
        key: orderData.keyId || RAZORPAY_KEY_ID,
        amount: Math.round(opts.amountInr * 100),
        currency: "INR",
        name: opts.name,
        description: opts.description,
        prefill: opts.prefill,
        theme: { color: "#6366f1" },
        handler: (resp: any) => {
          opts.onSuccess({
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_order_id: orderData.id,
            razorpay_signature: "mock_signature",
          });
        },
        modal: { ondismiss: () => opts.onFailure("Payment cancelled") },
      });

      rp.on("payment.failed", (resp: any) =>
        opts.onFailure(resp?.error?.description || "Payment failed"),
      );

      rp.open();
      return;
    }

    // 2. Load Razorpay script
    await loadRazorpay();

    // 3. Open Razorpay Checkout modal with backend order ID
    const rp = new (window as any).Razorpay({
      key: orderData.keyId || RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: opts.name,
      description: opts.description,
      order_id: orderData.id,
      prefill: opts.prefill,
      theme: { color: "#6366f1" },
      handler: (resp: any) => {
        opts.onSuccess({
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_order_id: resp.razorpay_order_id || orderData.id,
          razorpay_signature: resp.razorpay_signature || "test_signature",
        });
      },
      modal: { ondismiss: () => opts.onFailure("Payment cancelled") },
    });

    rp.on("payment.failed", (resp: any) =>
      opts.onFailure(resp?.error?.description || "Payment failed"),
    );

    rp.open();
  } catch (e: any) {
    opts.onFailure(e?.message || "Could not complete payment process");
  }
}
