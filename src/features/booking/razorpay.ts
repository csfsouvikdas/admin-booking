// Replace with your Razorpay test key
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

export async function openRazorpay(opts: {
  amountInr: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  onSuccess: (paymentId: string) => void;
  onFailure: (msg: string) => void;
}) {
  try {
    await loadRazorpay();
    const rp = new (window as any).Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: Math.round(opts.amountInr * 100),
      currency: "INR",
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: "#6366f1" },
      handler: (resp: any) => opts.onSuccess(resp.razorpay_payment_id || "test_payment"),
      modal: { ondismiss: () => opts.onFailure("Payment cancelled") },
    });
    rp.on("payment.failed", (resp: any) =>
      opts.onFailure(resp?.error?.description || "Payment failed"),
    );
    rp.open();
  } catch (e: any) {
    opts.onFailure(e?.message || "Could not load Razorpay");
  }
}
