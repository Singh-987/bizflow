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
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");

const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

if (!host) {
    throw new Error("Unable to determine the request host.");
}

const response = await fetch(
    `${protocol}://${host}/api/expenses`,
    {
        cache: "no-store",
        headers: {
            cookie: requestHeaders.get("cookie") ?? "",
        },
    }
);

    const expenses = response.ok
        ? await response.json()
        : [];

    return (
        <AppShell>
            <LeaseHighlight targetId={highlightId} />

            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Page heading */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Expenses
                    </h1>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Track and manage your property expenses.
                    </p>
                </div>

                {/* Add expense form */}
                <ExpenseForm />

                {/* Expense history, search and pagination */}
                <ExpensesList expenses={expenses} />
            </div>
        </AppShell>
    );
}