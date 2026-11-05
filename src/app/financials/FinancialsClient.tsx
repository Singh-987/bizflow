"use client";

import AppShell from "@/components/layout/AppShell";
import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";

type UnitFinancial = {
  propertyId: number;
  propertyName: string;
  unitId: number;
  unitNumber: number;
  leaseId: number;
  tenantId: number | null;
  tenantName: string;
  rent: number;
  rentPaid: number;
  advanceReceived: number;
  rentPending: number;
  electricityDue: number;
  electricityPaid: number;
  electricityPending: number;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  status: string;
};

type PaymentDetail = {
  id: number;
  amount: number;
  paidOn: string;
  month: string;
  method: string;
  type: string;
  note: string | null;
  propertyName: string;
  unitNumber: number;
  tenantName: string;
};

type FinancialsData = {
  month: string;
  rentDue: number;
  electricityDue: number;
  totalDue: number;
  paymentsReceived: number;
  outstanding: number;
  expenses: number;
  netIncome: number;
  unitDetails: UnitFinancial[];
  paymentDetails: PaymentDetail[];
};

const formatCurrency = (amount: number | null | undefined) =>
  `₹${(Number(amount) || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900";

const tableCellClass =
  "whitespace-nowrap px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300";

export default function Financials() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [financialsData, setFinancialsData] =
    useState<FinancialsData | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [error, setError] = useState("");

  // Automatically fetch data on initial load and whenever month changes
  useEffect(() => {
    if (!month) return;

    let cancelled = false;

    async function fetchFinancials() {
      setFinancialsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/financials?month=${encodeURIComponent(month)}`,
          { cache: "no-store" }
        );

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load financial records."
          );
        }

        if (!cancelled) {
          setFinancialsData(data);
        }
      } catch (err) {
        console.error("LOAD FINANCIALS ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading financials."
          );
        }
      } finally {
        if (!cancelled) {
          setFinancialsLoading(false);
        }
      }
    }

    fetchFinancials();

    return () => {
      cancelled = true;
    };
  }, [month]);

  const summaryCards = financialsData
    ? [
        { label: "Rent Due", value: financialsData.rentDue },
        { label: "Electricity Due", value: financialsData.electricityDue },
        { label: "Total Due", value: financialsData.totalDue },
        {
          label: "Payments Received",
          value: financialsData.paymentsReceived,
          highlight: "text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "Outstanding",
          value: financialsData.outstanding,
          highlight:
            financialsData.outstanding > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-900 dark:text-slate-100",
        },
        { label: "Expenses", value: financialsData.expenses },
        {
          label: "Net Income",
          value: financialsData.netIncome,
          highlight:
            financialsData.netIncome >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
        },
      ]
    : [];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl space-y-8">
        {/* Page heading */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Financials
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review rental collection, utility balances, expenses, and net profit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="financial-month"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Month:
            </label>
            <input
              id="financial-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {financialsLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-3 h-7 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>

            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          </div>
        )}

        {/* Financial Content */}
        {!financialsLoading && financialsData && (
          <>
            {/* Summary cards */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Monthly Overview ({financialsData.month})
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <article
                    key={card.label}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5"
                  >
                    <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                      {card.label}
                    </p>
                    <p
                      className={`mt-2 break-words text-2xl font-bold tracking-tight ${
                        card.highlight || "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {formatCurrency(card.value)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Unit financial details */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Unit Financial Details
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Detailed rent and utility balance per unit.
                </p>
              </div>

              {financialsData.unitDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No active unit financial records found for {financialsData.month}.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full min-w-[1150px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/80">
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Tenant
                        </th>
                        {[
                          "Rent Due",
                          "Rent Paid",
                          "Advance",
                          "Rent Pending",
                          "Electricity Due",
                          "Electricity Paid",
                          "Electricity Pending",
                          "Total Due",
                          "Total Paid",
                          "Total Pending",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300"
                          >
                            {heading}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {financialsData.unitDetails.map((unit) => (
                        <tr
                          key={`${unit.unitId}-${unit.leaseId}`}
                          className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 group-hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:group-hover:bg-slate-800">
                            <div>{unit.propertyName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Unit {unit.unitNumber}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {unit.tenantName}
                          </td>

                          <td className={tableCellClass}>{formatCurrency(unit.rent)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.rentPaid)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.advanceReceived)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.rentPending)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.electricityDue)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.electricityPaid)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.electricityPending)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.totalDue)}</td>
                          <td className={tableCellClass}>{formatCurrency(unit.totalPaid)}</td>
                          <td className={`${tableCellClass} font-bold text-rose-600 dark:text-rose-400`}>
                            {formatCurrency(unit.totalPending)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                unit.status.toUpperCase() === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                                  : unit.status.toUpperCase() === "PARTIAL"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                  : unit.status.toUpperCase() === "OVERDUE"
                                  ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                              }`}
                            >
                              {unit.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Payment details */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Payment Details
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Transactions logged for {financialsData.month}.
                </p>
              </div>

              {financialsData.paymentDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No payments logged for this month.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {[...financialsData.paymentDetails]
                    .sort(
                      (a, b) =>
                        new Date(b.paidOn).getTime() -
                        new Date(a.paidOn).getTime()
                    )
                    .map((payment) => (
                      <article
                        key={payment.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                              {payment.tenantName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {payment.propertyName ? `${payment.propertyName} · ` : ""}
                              Unit {payment.unitNumber}
                            </p>
                          </div>

                          <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {payment.type}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                          <div>
                            <span className="text-slate-400">For Month:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {payment.month}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Paid On:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {formatDate(payment.paidOn)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Method:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {payment.method}
                            </span>
                          </div>
                          {payment.note && (
                            <div className="col-span-2 mt-1">
                              <span className="text-slate-400">Note:</span>{" "}
                              <span>{payment.note}</span>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}