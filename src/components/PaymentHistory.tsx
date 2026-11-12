"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

const getTypeBadge = (type: string) => {
  switch (type?.toUpperCase()) {
    case "RENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    case "ELECTRICITY":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
  }
};

export default function PaymentHistory({
  payments = [],
}: {
  payments: any[];
}) {
  const [showAll, setShowAll] = useState(false);

  const visiblePayments = showAll ? payments : payments.slice(0, 1);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Payment History
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {payments.length} {payments.length === 1 ? "payment" : "payments"} recorded
          </p>
        </div>

        {payments.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showAll ? "Show Recent" : `View All (${payments.length})`}
          </button>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No payments recorded yet
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Logged receipts and rent payments will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-3">Payment</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Paid On</th>
                <th className="py-2.5 pl-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visiblePayments.map((item) => (
                <tr
                  id={`payment-${item.id}`}
                  key={item.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTypeBadge(
                          item.payment?.paymentType
                        )}`}
                      >
                        {item.payment?.paymentType || "PAYMENT"}
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.payment?.month || "-"}
                      </span>
                    </div>

                    {item.payment?.note && (
                      <p className="mt-1 line-clamp-1 text-xs italic text-slate-500 dark:text-slate-400">
                        {item.payment.note}
                      </p>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {item.payment?.method || "Cash"}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {formatDate(item.payment?.paidOn)}
                  </td>

                  <td className="whitespace-nowrap py-3 pl-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(item.payment?.amount || 0).toLocaleString("en-IN")}
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