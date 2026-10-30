"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

export default function PaymentHistory({
  payments,
}: {
  payments: any[];
}) {
  const [showAll, setShowAll] = useState(false);

  const visiblePayments = showAll ? payments : payments.slice(0, 1);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Payment History
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {payments.length} payment(s) recorded
          </p>
        </div>

        {payments.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showAll ? "Show less" : "View all"}
          </button>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          No payments recorded yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-3 py-3 font-medium">Payment</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium">Paid On</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>

            <tbody>
              {visiblePayments.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {item.payment.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.payment.month}
                    </p>
                  </td>

                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {item.payment.method}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                    {formatDate(item.payment.paidOn)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    ₹{Number(item.payment.amount).toLocaleString("en-IN")}
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