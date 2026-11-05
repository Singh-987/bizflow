"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LeaseActions({
  leaseId,
  status,
}: {
  leaseId: number;
  status: string;
}) {
  const router = useRouter();
  const [showExtend, setShowExtend] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");
  const [loadingAction, setLoadingAction] = useState<"end" | "extend" | null>(null);

  if (status === "ENDED") {
    return null;
  }

  async function endLease() {
    const confirmed = window.confirm("Are you sure you want to end this lease?");
    if (!confirmed) return;

    setLoadingAction("end");

    try {
      const response = await fetch("/api/leases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId,
          action: "END",
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Failed to end lease"}`);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("END LEASE ERROR:", error);
      alert("Something went wrong while ending the lease.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function extendLease() {
    if (!newEndDate) {
      alert("New end date is required");
      return;
    }

    setLoadingAction("extend");

    try {
      const response = await fetch("/api/leases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId,
          action: "EXTEND",
          agreementEndsOn: newEndDate,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Failed to extend lease"}`);
        return;
      }

      setShowExtend(false);
      setNewEndDate("");
      router.refresh();
    } catch (error) {
      console.error("EXTEND LEASE ERROR:", error);
      alert("Something went wrong while extending the lease.");
    } finally {
      setLoadingAction(null);
    }
  }

  const isBusy = loadingAction !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!showExtend && (
        <button
          type="button"
          onClick={() => setShowExtend(true)}
          disabled={isBusy}
          className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          Extend Lease
        </button>
      )}

      {showExtend && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            disabled={isBusy}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
          />
          <button
            type="button"
            onClick={extendLease}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction === "extend" ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Extending...</span>
              </>
            ) : (
              "Save"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowExtend(false);
              setNewEndDate("");
            }}
            disabled={isBusy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={endLease}
        disabled={isBusy}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {loadingAction === "end" ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Ending...</span>
          </>
        ) : (
          "End Lease"
        )}
      </button>
    </div>
  );
}