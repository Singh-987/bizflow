import ExpenseForm from "@/components/ExpenseForm";
import ExpensesList from "@/components/ExpenseList";
import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const params = await searchParams;
  const highlightId = params.highlight ?? null;

  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/login");
  }

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  if (!host) {
    throw new Error("Unable to determine the request host.");
  }

  let expenses: any[] = [];
  let loadError = false;

  try {
    const response = await fetch(`${protocol}://${host}/api/expenses`, {
      cache: "no-store",
      headers: {
        cookie: requestHeaders.get("cookie") ?? "",
      },
    });

    if (response.ok) {
      const data = await response.json();
      expenses = Array.isArray(data) ? data : [];
    } else {
      loadError = true;
    }
  } catch (error) {
    console.error("LOAD EXPENSES ERROR:", error);
    loadError = true;
  }

  const totalExpenseAmount = expenses.reduce(
    (total: number, item: any) => total + Number(item.amount || 0),
    0
  );

  return (
    <AppShell>
      <LeaseHighlight targetId={highlightId} />

      <main className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track, categorize, and manage operating outlays across your properties.
          </p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            Failed to load your latest expenses. Please refresh the page.
          </div>
        )}

        {/* Quick Summary Cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expenses
            </p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
              ₹{totalExpenseAmount.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Recorded
            </p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
              {expenses.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Latest Month
            </p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
              {expenses[0]?.date ? new Date(expenses[0].date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
            </p>
          </div>
        </section>

        {/* Add expense form */}
        <ExpenseForm />

        {/* Expense history table */}
        <ExpensesList expenses={expenses} />
      </main>
    </AppShell>
  );
}