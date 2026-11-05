"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function PaymentForm({
  leaseId,
  autoOpen = false,
  embedded = false,
}: {
  leaseId: string;
  autoOpen?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showPayment, setShowPayment] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) {
      setShowPayment(true);
    }
  }, [autoOpen]);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMonth, setPaymentMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentType, setPaymentType] = useState("RENT");
  const [paymentNote, setPaymentNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  function resetForm() {
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMonth(new Date().toISOString().slice(0, 7));
    setPaymentMethod("UPI");
    setPaymentType("RENT");
    setPaymentNote("");
    setStatusMessage(null);
  }

  async function addPayment() {
    setStatusMessage(null);

    const cleanAmount = paymentAmount.trim();
    if (!cleanAmount || !paymentDate || !paymentMonth || !paymentMethod) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required payment fields.",
      });
      return;
    }

    const amount = Number(cleanAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusMessage({
        type: "error",
        text: "Payment amount must be greater than zero.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaseId,
          amount,
          paidOn: paymentDate,
          month: paymentMonth,
          method: paymentMethod,
          type: paymentType,
          note: paymentNote.trim() || null,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        setStatusMessage({
          type: "error",
          text: `Unable to record payment: ${text || `Error ${response.status}`}`,
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: "Payment recorded successfully.",
      });

      window.dispatchEvent(
        new CustomEvent("electricity-bill-updated", {
          detail: { leaseId },
        })
      );

      resetForm();

      startTransition(() => {
        router.refresh();
      });

      setTimeout(() => {
        setShowPayment(false);
        setStatusMessage(null);
      }, 1200);
    } catch (error) {
      console.error("ADD PAYMENT ERROR:", error);
      setStatusMessage({
        type: "error",
        text: "Something went wrong while recording the payment.",
      });
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading || isPending;

  const inputClass =
    "mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900";

  const labelClass =
    "block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <div className="w-full">
      {!embedded && !showPayment && (
        <button
          type="button"
          onClick={() => {
            setShowPayment(true);
            setStatusMessage(null);
          }}
          disabled={isBusy}
          className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          Add Payment
        </button>
      )}

      {showPayment && (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                Record Payment
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log a received rent, electricity, or maintenance payment.
              </p>
            </div>
            {!embedded && (
              <button
                type="button"
                onClick={() => {
                  setShowPayment(false);
                  resetForm();
                }}
                className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={isBusy}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Payment Type *</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                disabled={isBusy}
                className={inputClass}
              >
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SECURITY_DEPOSIT">Security Deposit</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={isBusy}
                className={inputClass}
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Paid On Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isBusy}
                className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
              />
            </div>

            <div>
              <label className={labelClass}>For Month *</label>
              <input
                type="month"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                disabled={isBusy}
                className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
              />
            </div>

            <div>
              <label className={labelClass}>Note / Ref ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref #2394..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                disabled={isBusy}
                className={inputClass}
              />
            </div>
          </div>

          {statusMessage && (
            <div
              role="alert"
              className={`mt-4 rounded-lg border px-3.5 py-2.5 text-xs ${
                statusMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? "✓ " : "⚠️ "}
              {statusMessage.text}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addPayment}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                "Save Payment"
              )}
            </button>

            {!embedded && (
              <button
                type="button"
                onClick={() => {
                  setShowPayment(false);
                  resetForm();
                }}
                disabled={isBusy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}