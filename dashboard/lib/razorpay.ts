"use client";

export interface RazorpayCheckoutParams {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ── GLOBAL SINGLE-FLIGHT PAYMENT MUTEX ──
// Prevents duplicate triggers if a user double-clicks or rapidly clicks the payment button
let isGlobalPaymentLocked = false;
let activeRazorpayInstance: any = null;

/**
 * Checks whether any payment operation or modal is currently active.
 */
export function isPaymentInProgress(): boolean {
  return isGlobalPaymentLocked || activeRazorpayInstance !== null;
}

/**
 * Executes a payment callback ensuring strictly one execution at a time.
 * If the user clicks 2 times rapidly or double-clicks, the second click
 * is immediately ignored and safely discarded.
 */
export async function withSinglePaymentLock<T>(
  action: () => Promise<T>
): Promise<T | null> {
  if (isGlobalPaymentLocked) {
    console.warn("[PaymentLock] Duplicate payment click prevented.");
    return null;
  }

  isGlobalPaymentLocked = true;
  try {
    return await action();
  } finally {
    // 600ms grace debounce window so mouse bounce double-clicks are absorbed
    setTimeout(() => {
      isGlobalPaymentLocked = false;
    }, 600);
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function openRazorpayModal(
  params: RazorpayCheckoutParams
): Promise<RazorpaySuccessResponse> {
  return new Promise(async (resolve, reject) => {
    // If a modal is already open, reject duplicate call immediately
    if (activeRazorpayInstance) {
      console.warn("[PaymentModal] Razorpay modal is already active. Ignoring duplicate invocation.");
      reject(new Error("PAYMENT_ALREADY_IN_PROGRESS"));
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      reject(
        new Error(
          "Failed to load Razorpay Checkout SDK. Please verify your internet connection."
        )
      );
      return;
    }

    const cleanup = () => {
      activeRazorpayInstance = null;
    };

    const options = {
      key: params.keyId,
      amount: params.amount,
      currency: params.currency || "INR",
      name: params.name || "WebIntoApp",
      description: params.description || "App Subscription Payment",
      order_id: params.orderId,
      prefill: params.prefill || {},
      theme: {
        color: params.themeColor || "#78350f",
      },
      handler: function (response: RazorpaySuccessResponse) {
        cleanup();
        resolve(response);
      },
      modal: {
        ondismiss: function () {
          cleanup();
          reject(new Error("PAYMENT_CANCELLED"));
        },
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      activeRazorpayInstance = rzp;

      rzp.on("payment.failed", function (response: any) {
        cleanup();
        reject(
          new Error(
            response.error?.description || "Payment failed at gateway."
          )
        );
      });

      rzp.open();
    } catch (err: any) {
      cleanup();
      reject(new Error("Could not initialize Razorpay modal: " + err.message));
    }
  });
}
