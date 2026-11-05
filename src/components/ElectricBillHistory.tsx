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
    async function refreshBills() {
      setLoading(true);
      try {
        const response = await fetch(`/api/electricbill?leaseId=${leaseId}`);
        if (!response.ok) throw new Error("Failed to load bills.");
        const electricity = await response.json();
        const lease = electricity.find(
          (item: any) =>
            String(item.lease?.id ?? item.leaseId) === String(leaseId)
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Electricity Bill History
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {bills.length} {bills.length === 1 ? "bill" : "bills"} recorded
          </p>
        </div>

        {bills.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showAll ? "Show Recent" : `View All (${bills.length})`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No electricity bills recorded yet
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Generate a bill above to start tracking meter records.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-3">Month</th>
                <th className="px-3 py-2.5 text-right">Previous</th>
                <th className="px-3 py-2.5 text-right">Current</th>
                <th className="px-3 py-2.5 text-right">Units</th>
                <th className="px-3 py-2.5 text-right">Rate/Unit</th>
                <th className="py-2.5 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleBills.map((bill) => (
                <tr
                  key={bill.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 pr-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {bill.month}
                    </span>
                    {bill.meterChanged && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Replaced
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                    {bill.previousReading}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                    {bill.currentReading}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-900 dark:text-white">
                    {bill.unitsUsed}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                    ₹{Number(bill.perUnitCharge || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(bill.electricityBill || 0).toLocaleString("en-IN")}
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