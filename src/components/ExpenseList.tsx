"use client";

import { useMemo, useState } from "react";

type Expense = {
    id: string | number;
    amount: number;
    category: string;
    date: string;
    note?: string | null;
    property?: {
        name?: string;
    } | null;
};

type ExpensesListProps = {
    expenses: Expense[];
};

const PAGE_SIZE = 8;

export default function ExpensesList({
    expenses,
}: ExpensesListProps) {
    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const filteredExpenses = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...expenses]
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() -
                    new Date(a.date).getTime()
            )
            .filter((expense) => {
                if (!query) return true;

                const expenseDate = new Date(expense.date);

const searchableDate = [
    expense.date,
    expenseDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }),
    expenseDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }),
    expenseDate.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
    }),
    expenseDate.toLocaleDateString("en-US", {
        month: "long",
        timeZone: "UTC",
    }),
    String(expenseDate.getUTCMonth() + 1),
    String(expenseDate.getUTCFullYear()),
];

return [
    expense.property?.name,
    expense.category,
    expense.amount,
    ...searchableDate,
    expense.note,
].some((value) =>
    String(value ?? "")
        .toLowerCase()
        .includes(query)
);
            });
    }, [expenses, search]);

    const visibleExpenses = filteredExpenses.slice(
        0,
        visibleCount
    );

    return (
        <section className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Expense History
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Showing {visibleExpenses.length} of{" "}
                        {filteredExpenses.length} matching expenses
                    </p>
                </div>

                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="Search expenses..."
                    aria-label="Search expenses"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
                />
            </div>

            {filteredExpenses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                        {search
                            ? "No matching expenses found"
                            : "No expenses recorded yet"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {search
                            ? "Try a different property, category, date, amount, or note."
                            : "Your recorded expenses will appear here."}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {visibleExpenses.map((item) => (
                            <article
                                id={`expense-${item.id}`}
                                key={item.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 transition-colors dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h3 className="break-words font-semibold text-slate-900 dark:text-slate-100">
                                            {item.property?.name ??
                                                "Unknown property"}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {item.category}
                                        </p>

                                        {item.note && (
                                            <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
                                                {item.note}
                                            </p>
                                        )}
                                    </div>

                                    <div className="shrink-0 sm:text-right">
                                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                            {Number(item.amount).toLocaleString(
                                                "en-IN",
                                                {
                                                    style: "currency",
                                                    currency: "INR",
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {new Date(
                                                item.date
                                            ).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                timeZone: "UTC",
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {visibleExpenses.length <
                        filteredExpenses.length && (
                        <div className="mt-5 text-center">
                            <button
                                type="button"
                                onClick={() =>
                                    setVisibleCount(
                                        (count) => count + PAGE_SIZE
                                    )
                                }
                                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                Load More Expenses
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}