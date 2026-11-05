"use client";

import { useEffect, useState } from "react";
import PaymentForm from "@/components/PaymentForm";

type Lease = {
  id: number;
  tenant: {
    name: string;
  };
  property: {
    name: string;
  };
  unit: {
    number: string | number;
  };
  rent: number;
  status: string;
};

const getStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    case "ENDED":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
  }
};

export default function PaymentsPageForm() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLeases() {
      try {
        const response = await fetch("/api/leases", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load leases.");
        }

        if (!cancelled) {
          setLeases(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load leases."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeases();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLease = leases.find(
    (lease) => String(lease.id) === selectedLeaseId
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Record New Payment
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Select a tenant and unit to log rent, electricity, or deposit receipts.
          </p>
        </div>

        {selectedLease && showPaymentForm && (
          <button
            type="button"
            onClick={() => setShowPaymentForm(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close Form
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 pt-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : leases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No leases found. You must create an active lease before recording a payment.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="payment-lease"
              className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Choose Lease / Unit *
            </label>

            <select
              id="payment-lease"
              value={selectedLeaseId}
              onChange={(event) => {
                setSelectedLeaseId(event.target.value);
                setShowPaymentForm(false);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
            >
              <option value="">Select a tenant and unit</option>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenant?.name || "Unknown"} · {lease.property?.name || "Property"} · Unit{" "}
                  {lease.unit?.number || "-"} ({lease.status})
                </option>
              ))}
            </select>
          </div>

          {selectedLease && (
            <div className="space-y-4">
              {selectedLease.status?.toUpperCase() === "ENDED" && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <p className="font-semibold">⚠️ Notice: This lease has ended</p>
                  <p className="mt-1">
                    You are recording a payment against a completed lease. Only proceed if this payment covers an outstanding overdue balance.
                  </p>
                </div>
              )}

              {/* Lease Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Agreed Rent
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      ₹{Number(selectedLease.rent || 0).toLocaleString("en-IN")}/mo
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                      selectedLease.status
                    )}`}
                  >
                    {selectedLease.status}
                  </span>
                </div>

                {!showPaymentForm && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(true)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    Enter Payment Details
                  </button>
                )}
              </div>

              {/* Embedded Payment Form */}
              {showPaymentForm && (
                <div className="pt-1">
                  <PaymentForm
                    key={selectedLease.id}
                    leaseId={String(selectedLease.id)}
                    autoOpen
                    embedded
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}