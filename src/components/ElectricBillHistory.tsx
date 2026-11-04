"use client";

import { useEffect, useState } from "react";

export type ElectricityBillRecord = {
  id: number | string;
  month: string;
  meterChanged?: boolean;
  previousReading: number | string;
  currentReading: number | string;
  unitsUsed: number | string;
  perUnitCharge: number | string;
  electricityBill: number | string;
};

export default function ElectricityBillHistory({
  leaseId,
  initialBills = [],
}: {
  leaseId: string;
  initialBills?: ElectricityBillRecord[];
}) {
  const [bills, setBills] = useState<ElectricityBillRecord[]>(initialBills);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only refetch if an update event fires from the form
    async function refreshBills() {
      setLoading(true);
      try {
        const response = await fetch(`/api/electricbill?leaseId=${leaseId}`);
        if (!response.ok) throw new Error("Failed to load bills.");
        const electricity = await response.json();
        const lease = electricity.find(
          (item: any) => String(item.lease?.id ?? item.leaseId) === String(leaseId)
        );
        const sortedBills = [...(lease?.bills ?? [])].sort((a, b) =>
          b.month.localeCompare(a.month)
        );
        setBills(sortedBills);
      } catch (error) {
        console.error("LOAD ELECTRICITY BILLS ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    function handleBillUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ leaseId: string }>;
      if (String(customEvent.detail?.leaseId) === String(leaseId)) {
        refreshBills();
      }
    }

    window.addEventListener("electricity-bill-updated", handleBillUpdated);
    return () => {
      window.removeEventListener("electricity-bill-updated", handleBillUpdated);
    };
  }, [leaseId]);

  const visibleBills = showAll ? bills : bills.slice(0, 1);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Electricity Bill History
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {bills.length} bill(s) recorded
          </p>
        </div>
        {bills.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showAll ? "Show Less" : "View All"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Refreshing electricity bills...
        </p>
      ) : bills.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          No electricity bills recorded yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-2 py-3">Month</th>
                <th className="px-2 py-3">Previous</th>
                <th className="px-2 py-3">Current</th>
                <th className="px-2 py-3">Units</th>
                <th className="px-2 py-3">Rate/Unit</th>
                <th className="px-2 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visibleBills.map((bill) => (
                <tr
                  key={bill.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-2 py-3">
                    <p className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      {bill.month}
                    </p>
                    {bill.meterChanged && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Meter replaced
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                    {bill.previousReading}
                  </td>
                  <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                    {bill.currentReading}
                  </td>
                  <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                    {bill.unitsUsed}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-slate-600 dark:text-slate-300">
                    ₹{Number(bill.perUnitCharge).toLocaleString("en-IN")}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    ₹{Number(bill.electricityBill).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}