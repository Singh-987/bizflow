import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import PaymentsPageForm from "@/components/PaymentPageForm";
import { auth } from "@/lib/auth";
import { getPaymentsForUser } from "@/lib/data/payment";
import { formatDate } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const formatCurrency = (amount: number | string | null | undefined) =>
  `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const getPaymentTypeBadge = (type: string) => {
  switch (type?.toUpperCase()) {
    case "RENT":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    case "ELECTRICITY":
      return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
  }
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const params = await searchParams;
  const highlightId = params.highlight ?? null;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const rawPayments = await getPaymentsForUser(session.user.id);
  const payments = Array.isArray(rawPayments) ? rawPayments : [];

  const sortedPayments = [...payments].sort(
    (a: any, b: any) =>
      new Date(b.payment?.paidOn ?? 0).getTime() -
      new Date(a.payment?.paidOn ?? 0).getTime()
  );

  const totalReceived = payments.reduce(
    (total: number, item: any) => total + Number(item.payment?.amount ?? 0),
    0
  );

  const rentPaymentsCount = payments.filter(
    (item: any) => item.payment?.type === "RENT"
  ).length;

  const electricityPaymentsCount = payments.filter(
    (item: any) => item.payment?.type === "ELECTRICITY"
  ).length;

  return (
    <AppShell>
      <LeaseHighlight targetId={highlightId} />

      <main className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Payments
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track rent, security deposits, and electricity receipts across your properties.
          </p>
        </div>

        {/* Record Payment Form Component */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <PaymentsPageForm />
        </div>

        {/* Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Total Received
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalReceived)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Rent Payments
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {rentPaymentsCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Electricity Payments
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {electricityPaymentsCount}
            </p>
          </div>
        </section>

        {/* Payment History List */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Payment Records ({sortedPayments.length})
          </h2>

          {sortedPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-slate-900 dark:text-white">
                No payments recorded yet
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Log tenant payments using the form above to see your receipts here.
              </p>
            </div>
          ) : (
            sortedPayments.map((item: any) => (
              <article
                id={`payment-${item.id}`}
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {item.tenant?.name || "Unknown Tenant"}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.property?.name ? `${item.property.name} · ` : ""}
                      Unit {item.unit?.number || "-"}
                    </p>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.payment?.amount)}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPaymentTypeBadge(
                        item.payment?.type
                      )}`}
                    >
                      {item.payment?.type || "PAYMENT"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:grid-cols-3">
                  <div>
                    <span className="text-slate-400">For Month: </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.payment?.month || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Paid On: </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDate(item.payment?.paidOn)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Method: </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.payment?.method || "Cash"}
                    </span>
                  </div>

                  {item.payment?.note && (
                    <div className="sm:col-span-3">
                      <span className="text-slate-400">Note: </span>
                      <span className="italic text-slate-700 dark:text-slate-300">
                        {item.payment.note}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}