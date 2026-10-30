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
    (Number(amount) || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    });

const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900";

const tableCellClass =
    "whitespace-nowrap px-4 py-3 text-right text-slate-700 dark:text-slate-300";

export default function Financials() {
    const [month, setMonth] = useState("");
    const [checkingAuth, setCheckingAuth]= useState(true);
    const [financialsData, setFinancialsData] =
        useState<FinancialsData | null>(null);
    const [financialsLoading, setFinancialsLoading] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
        try {
            const response = await fetch("/api/auth/get-session", {
                cache: "no-store",
            });

            if (!response.ok) {
                window.location.replace("/login");
                return;
            }

            const session = await response.json();

            if (!session) {
                window.location.replace("/login");
                return;
            }

            if (!cancelled) {
                setCheckingAuth(false);
            }
        } catch {
            window.location.replace("/login");
        }
    }

    checkAuth();

    return () => {
        cancelled = true;
    };
}, []);
    async function loadFinancials() {
        if (!month) {
            setError("Please select a month first.");
            return;
        }

        setFinancialsLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/financials?month=${encodeURIComponent(month)}`,
                { cache: "no-store" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load financial records."
                );
            }

            setFinancialsData(data);
        } catch (err) {
            console.error("LOAD FINANCIALS ERROR:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while loading financials."
            );
        } finally {
            setFinancialsLoading(false);
        }
    }

    const summaryCards = financialsData
        ? [
            {
                label: "Rent Due",
                value: financialsData.rentDue,
            },
            {
                label: "Electricity Due",
                value: financialsData.electricityDue,
            },
            {
                label: "Total Due",
                value: financialsData.totalDue,
            },
            {
                label: "Payments Received",
                value: financialsData.paymentsReceived,
            },
            {
                label: "Outstanding",
                value: financialsData.outstanding,
            },
            {
                label: "Expenses",
                value: financialsData.expenses,
            },
            {
                label: "Net Income",
                value: financialsData.netIncome,
            },
        ]
        : [];
    if (checkingAuth) {
    return (
        <AppShell>
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Checking authentication...
            </div>
        </AppShell>
    );
}
    return (
        <AppShell>
            <main className="mx-auto w-full max-w-7xl space-y-8">
                {/* Page heading */}
                <header>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                        Financials
                    </h1>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Review rental income, outstanding balances, expenses,
                        and payment history for a selected month.
                    </p>
                </header>

                {/* Month filter */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="w-full sm:max-w-xs">
                            <label
                                htmlFor="financial-month"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                Select month
                            </label>

                            <input
                                id="financial-month"
                                type="month"
                                value={month}
                                onChange={(event) =>
                                    setMonth(event.target.value)
                                }
                                disabled={financialsLoading}
                                className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={loadFinancials}
                            disabled={financialsLoading || !month}
                            className="min-h-11 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
                        >
                            {financialsLoading
                                ? "Loading financials..."
                                : "Load Financials"}
                        </button>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                        >
                            {error}
                        </p>
                    )}
                </section>

                {/* Initial state */}
                {!financialsData && !financialsLoading && !error && (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
                        <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                            Select a month to view your financials
                        </h2>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Your income, expenses, outstanding balances, and
                            payment records will appear here.
                        </p>
                    </div>
                )}

                {financialsLoading && (
                    <div
                        role="status"
                        className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                    >
                        Loading financial records...
                    </div>
                )}

                {financialsData && !financialsLoading && (
                    <>
                        {/* Summary cards */}
                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Monthly Overview
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Financial summary for {financialsData.month}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {summaryCards.map((card) => (
                                    <article
                                        key={card.label}
                                        className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            {card.label}
                                        </p>

                                        <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                                            {formatCurrency(card.value)}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        {/* Unit financial details */}
                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Unit Financial Details
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Rent and electricity balances for each unit.
                                </p>
                            </div>

                            {financialsData.unitDetails.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No unit financial records found for this
                                    month.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                    <table className="w-full min-w-[1150px] text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800">
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
                                                    "Advance Received",
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

                                                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {financialsData.unitDetails.map(
                                                (unit) => (
                                                    <tr
                                                        key={`${unit.unitId}-${unit.leaseId}`}
                                                        className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                                                    >
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                                                            <div>
                                                                {unit.propertyName}
                                                            </div>

                                                            <div className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                                                                Unit{" "}
                                                                {unit.unitNumber}
                                                            </div>
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                                                            {unit.tenantName}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.rent)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.rentPaid)}
                                                        </td>
                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.advanceReceived)}
                                                        </td>
                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.rentPending)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.electricityDue)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.electricityPaid)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.electricityPending)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.totalDue)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.totalPaid)}
                                                        </td>

                                                        <td className={tableCellClass}>
                                                            {formatCurrency(unit.totalPending)}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${unit.status.toUpperCase() === "PAID"
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                                        : unit.status.toUpperCase() === "PARTIAL"
                                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                                                            : unit.status.toUpperCase() === "OVERDUE"
                                                                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                                    }`}
                                                            >
                                                                {unit.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Payment details */}
                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Payment Details
                                </h2>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Payments recorded for the selected month.
                                </p>
                            </div>

                            {financialsData.paymentDetails.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No payments found for this month.
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
                                                className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="break-words text-lg font-bold text-slate-900 dark:text-slate-100">
                                                            {formatCurrency(
                                                                payment.amount
                                                            )}
                                                        </p>

                                                        <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                                                            {payment.tenantName}
                                                        </p>

                                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                            {payment.propertyName
                                                                ? `${payment.propertyName} · `
                                                                : ""}
                                                            Unit{" "}
                                                            {payment.unitNumber}
                                                        </p>
                                                    </div>

                                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                        {payment.type}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 dark:border-slate-800">
                                                    <div>
                                                        <p className="text-slate-500 dark:text-slate-400">
                                                            For month
                                                        </p>

                                                        <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                                                            {payment.month}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-slate-500 dark:text-slate-400">
                                                            Paid on
                                                        </p>

                                                        <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                                                            {formatDate(
                                                                payment.paidOn
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-slate-500 dark:text-slate-400">
                                                            Payment method
                                                        </p>

                                                        <p className="mt-1 break-words font-medium text-slate-800 dark:text-slate-200">
                                                            {payment.method}
                                                        </p>
                                                    </div>

                                                    {payment.note && (
                                                        <div className="sm:col-span-2">
                                                            <p className="text-slate-500 dark:text-slate-400">
                                                                Note
                                                            </p>

                                                            <p className="mt-1 break-words text-slate-800 dark:text-slate-200">
                                                                {payment.note}
                                                            </p>
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