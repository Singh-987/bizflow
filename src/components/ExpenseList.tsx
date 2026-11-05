"use client";

import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

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

const getCategoryBadgeClass = (category: string) => {
  const norm = category?.toUpperCase() || "";
  if (norm.includes("MAINTENANCE") || norm.includes("REPAIR")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
  }
  if (norm.includes("UTILITY") || norm.includes("ELECTRIC") || norm.includes("WATER")) {
    return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
  }
  if (norm.includes("TAX") || norm.includes("LEGAL") || norm.includes("INSURANCE")) {
    return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800";
  }
  if (norm.includes("CLEANING") || norm.includes("SUPPLIES")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

export default function ExpensesList({ expenses }: ExpensesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((expense) => {
        if (selectedCategory !== "ALL" && expense.category !== selectedCategory) {
          return false;
        }

        if (!query) return true;

        const dateStr = String(expense.date || "");
        const formattedDate = formatDate(expense.date).toLowerCase();

        return [
          expense.property?.name,
          expense.category,
          String(expense.amount),
          dateStr,
          formattedDate,
          expense.note,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );
      });
  }, [expenses, search, selectedCategory]);

  const visibleExpenses = filteredExpenses.slice(0, visibleCount);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [filteredExpenses]);

  async function executeDelete(id: string | number) {
    setDeletingId(id);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setErrorMessage("Failed to delete expense. Please try again.");
        return;
      }

      setPendingDeleteId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("DELETE EXPENSE ERROR:", err);
      setErrorMessage("Something went wrong while deleting this expense.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-8 space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Expense History
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Showing {visibleExpenses.length} of {filteredExpenses.length} expenses
            {filteredExpenses.length > 0 && (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {" "}· Total: ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            )}
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search property, category, note..."
            aria-label="Search expenses"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setVisibleCount(PAGE_SIZE);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Global Error Notice if deletion fails */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {/* Category filter pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition active:scale-[0.98] ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Expense List Cards */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {search || selectedCategory !== "ALL"
              ? "No matching expenses found"
              : "No expenses recorded yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {search || selectedCategory !== "ALL"
              ? "Try adjusting your search query or category filter."
              : "Your recorded property expenses will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleExpenses.map((item) => {
            const isDeleting = deletingId === item.id;
            const isConfirming = pendingDeleteId === item.id;

            return (
              <article
                id={`expense-${item.id}`}
                key={item.id}
                className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${
                  isDeleting ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-900 dark:text-slate-100">
                      {item.property?.name ?? "Unknown Property"}
                    </h3>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    {item.note && (
                      <p className="mt-2.5 break-words text-sm text-slate-600 dark:text-slate-400">
                        {item.note}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(item.amount).toLocaleString("en-IN")}
                    </p>

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isDeleting || isPending}
                          onClick={() => executeDelete(item.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border border-white border-r-transparent" />
                              Deleting...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting || isPending}
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isDeleting || isPending}
                        onClick={() => setPendingDeleteId(item.id)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Load More */}
      {visibleExpenses.length < filteredExpenses.length && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Load More Expenses ({filteredExpenses.length - visibleExpenses.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
}