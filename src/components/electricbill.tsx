"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function ElectricBill({
  leaseId,
  autoOpen = false,
}: {
  leaseId: string;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showBill, setShowBill] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      setShowBill(true);
    }
  }, [autoOpen]);

  const [currentReading, setCurrentReading] = useState("");
  const [billMonth, setBillMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [perUnitCharge, setPerUnitCharge] = useState("");
  const [meterChanged, setMeterChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousReading, setPreviousReading] = useState(0);
  const [latestPerUnitCharge, setLatestPerUnitCharge] = useState<number | null>(
    null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const current = Number(currentReading);
  const rate = Number(perUnitCharge);
  const unitsUsed = meterChanged
    ? current
    : Math.max(0, current - previousReading);
  const billAmount = unitsUsed * rate;

  useEffect(() => {
    let cancelled = false;

    async function loadElectricityDetails() {
      if (!leaseId || !billMonth) return;

      setLoadingDetails(true);
      try {
        const response = await fetch(
          `/api/electricbill?leaseId=${encodeURIComponent(
            leaseId
          )}&month=${encodeURIComponent(billMonth)}`
        );
        if (!response.ok) {
          throw new Error("Failed to load electricity details.");
        }
        const electricity = await response.json();
        const lease = Array.isArray(electricity)
          ? electricity.find(
              (item: any) => String(item.lease?.id) === String(leaseId)
            )
          : null;

        if (!cancelled && lease) {
          setPreviousReading(lease.previousReadingForMonth ?? 0);
          setLatestPerUnitCharge(lease.latestPerUnitChargeForMonth ?? null);

          if (
            lease.previousPerUnitChargeForMonth !== null &&
            lease.previousPerUnitChargeForMonth !== undefined &&
            !perUnitCharge
          ) {
            setPerUnitCharge(String(lease.previousPerUnitChargeForMonth));
          } else if (
            lease.latestPerUnitChargeForMonth !== null &&
            lease.latestPerUnitChargeForMonth !== undefined &&
            !perUnitCharge
          ) {
            setPerUnitCharge(String(lease.latestPerUnitChargeForMonth));
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("LOAD ELECTRICITY ERROR:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    }

    if (showBill && billMonth) {
      loadElectricityDetails();
    }

    return () => {
      cancelled = true;
    };
  }, [showBill, leaseId, billMonth]);

  async function addElectricPayment() {
    setStatusMessage(null);

    if (!currentReading || !billMonth || !perUnitCharge) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required fields (Month, Current Reading, Rate).",
      });
      return;
    }

    if (Number(currentReading) < 0 || Number(perUnitCharge) <= 0) {
      setStatusMessage({
        type: "error",
        text: "Readings and rate must be valid positive numbers.",
      });
      return;
    }

    if (!meterChanged && Number(currentReading) < previousReading) {
      setStatusMessage({
        type: "error",
        text: `Current reading (${currentReading}) cannot be less than previous reading (${previousReading}) unless the meter was replaced.`,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/electricbill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaseId,
          currentReading: Number(currentReading),
          month: billMonth,
          perUnitCharge: Number(perUnitCharge),
          meterChanged,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || `Unable to add bill (HTTP ${response.status})`,
        });
        return;
      }

      window.dispatchEvent(
        new CustomEvent("electricity-bill-updated", {
          detail: { leaseId },
        })
      );

      setStatusMessage({
        type: "success",
        text: "Electricity bill calculated and added successfully.",
      });

      setCurrentReading("");
      setPerUnitCharge("");
      setMeterChanged(false);

      startTransition(() => {
        router.refresh();
      });

      setTimeout(() => {
        setShowBill(false);
        setStatusMessage(null);
      }, 1400);
    } catch (error) {
      console.error("ADD BILL ERROR:", error);
      setStatusMessage({
        type: "error",
        text: "Something went wrong while adding the electricity bill.",
      });
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading || isPending;

  const inputClass =
    "mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900";

  return (
    <div className="w-full">
      {!showBill ? (
        <button
          type="button"
          onClick={() => {
            setShowBill(true);
            setStatusMessage(null);
          }}
          disabled={isBusy}
          className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          Add Electricity Bill
        </button>
      ) : (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                Calculate & Record Electricity Bill
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log meter consumption for the billing cycle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBill(false);
                setStatusMessage(null);
              }}
              className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bill Month */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Billing Month *
              </label>
              <input
                type="month"
                value={billMonth}
                onChange={(e) => setBillMonth(e.target.value)}
                disabled={isBusy}
                className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
              />
            </div>

            {/* Previous Reading */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Previous Reading
              </label>
              <div className="mt-1 flex h-[38px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {loadingDetails ? (
                  <span className="text-xs font-normal text-slate-400">
                    Loading...
                  </span>
                ) : (
                  `${previousReading} units`
                )}
              </div>
            </div>

            {/* Current Reading */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Reading *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1420"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                disabled={isBusy || loadingDetails}
                className={inputClass}
              />
            </div>

            {/* Rate Per Unit */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rate / Unit (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder={
                  latestPerUnitCharge !== null
                    ? `Default: ₹${latestPerUnitCharge}`
                    : "e.g. 8.5"
                }
                value={perUnitCharge}
                onChange={(e) => setPerUnitCharge(e.target.value)}
                disabled={isBusy || loadingDetails}
                className={inputClass}
              />
            </div>
          </div>

          {/* Replacement Meter Toggle */}
          <div className="mt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={meterChanged}
                onChange={(e) => setMeterChanged(e.target.checked)}
                disabled={isBusy}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600 dark:border-slate-700"
              />
              Electric meter was replaced during this billing cycle (starts from 0)
            </label>
          </div>

          {/* Bill Calculation Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Units Consumed
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {currentReading !== "" ? `${unitsUsed} units` : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Total Bill Amount
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {currentReading !== "" && perUnitCharge !== ""
                  ? `₹${billAmount.toLocaleString("en-IN")}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Status Message */}
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

          {/* Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addElectricPayment}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Saving Bill...</span>
                </>
              ) : (
                "Save Bill"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowBill(false);
                setCurrentReading("");
                setPerUnitCharge("");
                setMeterChanged(false);
                setStatusMessage(null);
              }}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}