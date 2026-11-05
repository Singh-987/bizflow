"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Tenant = {
  id: number;
  name: string;
  phone: string;
};

type CreateLeaseFormProps = {
  unitId: number;
  unitRent: number;
  tenants: Tenant[];
};

export default function CreateLeaseForm({
  unitId,
  unitRent,
  tenants,
}: CreateLeaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tenantId, setTenantId] = useState("");
  const [tenantLeaseWarning, setTenantLeaseWarning] = useState("");
  const [agreementStartsOn, setAgreementStartsOn] = useState("");
  const [agreementEndsOn, setAgreementEndsOn] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkTenantLease() {
      if (!tenantId) {
        setTenantLeaseWarning("");
        return;
      }

      try {
        const response = await fetch(`/api/leases?tenantId=${tenantId}`);

        if (!response.ok) {
          if (!cancelled) setTenantLeaseWarning("");
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          if (data.activeLease) {
            setTenantLeaseWarning(
              `This tenant already has an active lease on ${data.activeLease.propertyName}, Unit ${data.activeLease.unitNumber}.`
            );
          } else {
            setTenantLeaseWarning("");
          }
        }
      } catch {
        if (!cancelled) setTenantLeaseWarning("");
      }
    }

    checkTenantLease();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function createLease() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!tenantId) {
      setErrorMessage("Please select a tenant.");
      return;
    }

    if (!agreementStartsOn) {
      setErrorMessage("Agreement start date is required.");
      return;
    }

    if (agreementEndsOn && agreementEndsOn < agreementStartsOn) {
      setErrorMessage("Agreement end date cannot be earlier than the start date.");
      return;
    }

    const securityDepositValue =
      securityDeposit.trim() === "" ? 0 : Number(securityDeposit);

    if (
      !Number.isInteger(securityDepositValue) ||
      securityDepositValue < 0
    ) {
      setErrorMessage("Security deposit must be 0 or a positive whole number.");
      return;
    }

    if (leaseLoading || isPending) return;

    setLeaseLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const calculatedStatus =
      agreementStartsOn > today ? "UPCOMING" : "ACTIVE";

    try {
      const response = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: Number(tenantId),
          unitId,
          agreementStartsOn,
          agreementEndsOn: agreementEndsOn || null,
          rent: unitRent,
          securityDeposit: securityDepositValue,
          status: calculatedStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to create lease.");
        return;
      }

      setSuccessMessage("Lease created successfully.");
      setTenantId("");
      setAgreementStartsOn("");
      setAgreementEndsOn("");
      setSecurityDeposit("");
      setTenantLeaseWarning("");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("Something went wrong. Please check your connection and try again.");
    } finally {
      setLeaseLoading(false);
    }
  }

  const isBusy = leaseLoading || isPending;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          Create New Lease
        </h4>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Locked Rent: ₹{Number(unitRent).toLocaleString("en-IN")}/mo
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Tenant <span className="text-red-500">*</span>
          </label>
          <select
            value={tenantId}
            disabled={isBusy}
            onChange={(e) => {
              setTenantId(e.target.value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
          >
            <option value="">Select Tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.phone ? `· ${t.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={agreementStartsOn}
            disabled={isBusy}
            onChange={(e) => {
              setAgreementStartsOn(e.target.value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
            End Date <span className="text-slate-400">(Optional)</span>
          </label>
          <input
            type="date"
            value={agreementEndsOn}
            disabled={isBusy}
            onChange={(e) => {
              setAgreementEndsOn(e.target.value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Security Deposit (₹)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={securityDeposit}
            disabled={isBusy}
            onChange={(e) => {
              setSecurityDeposit(e.target.value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
          />
        </div>
      </div>

      {tenantLeaseWarning && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span className="font-semibold">⚠️ Notice: </span>
          {tenantLeaseWarning}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          ✓ {successMessage}
        </div>
      )}

      <button
        type="button"
        onClick={createLease}
        disabled={isBusy}
        className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Creating Lease...</span>
          </>
        ) : (
          "Create Lease"
        )}
      </button>
    </div>
  );
}