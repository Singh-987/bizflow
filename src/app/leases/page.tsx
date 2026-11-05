import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import LeaseActions from "../../components/LeaseActions";
import ElectricBill from "../../components/electricbill";
import PaymentForm from "../../components/PaymentForm";
import PaymentHistory from "@/components/PaymentHistory";
import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import ElectricityBillHistory from "@/components/ElectricBillHistory";
import { getPaymentsForUser } from "@/lib/data/payment";
import { getLeasesForUser, getElectricityBillsForUser } from "@/lib/data/leases";
import { formatDate } from "@/lib/utils";

const formatCurrency = (amount: number | string | null | undefined) =>
  `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    case "UPCOMING":
      return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
    case "ENDED":
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
};

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    leaseId?: string;
    action?: string;
    unitId?: string;
    propertyId?: string;
  }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const unitId = params.unitId;
  const leaseId = params.leaseId ? Number(params.leaseId) : null;
  const action = params.action;

  // Run all three reads in parallel
  const [leases, payments, allBills] = await Promise.all([
    getLeasesForUser(session.user.id),
    getPaymentsForUser(session.user.id),
    getElectricityBillsForUser(session.user.id),
  ]);

  // Group payments by lease
  const paymentsByLease = new Map<number, typeof payments>();
  for (const payment of payments) {
    const pLeaseId = payment.lease.id;
    const existing = paymentsByLease.get(pLeaseId);
    if (existing) {
      existing.push(payment);
    } else {
      paymentsByLease.set(pLeaseId, [payment]);
    }
  }

  // Group bills by lease
  const billsByLease = new Map<number, any[]>();
  for (const bill of allBills) {
    const bLeaseId = Number(bill.leaseId);
    const existing = billsByLease.get(bLeaseId);
    if (existing) {
      existing.push(bill);
    } else {
      billsByLease.set(bLeaseId, [bill]);
    }
  }

  return (
    <AppShell>
      <div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Leases
            </h1>
            {unitId && (
              <Link
                href={`/units/${unitId}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:underline active:scale-[0.98] dark:text-blue-400"
              >
                ← Back to Unit Details
              </Link>
            )}
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage your active, upcoming, and archived tenancy agreements.
            </p>
          </div>

          <Link
            href="/leases/create"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            + Create Lease
          </Link>
        </div>

        {leases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              No leases yet
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create a lease from a property unit to see it here.
            </p>
            <Link
              href="/leases/create"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Start First Lease
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <LeaseHighlight
              targetId={leaseId ? `lease-${leaseId}` : null}
              redirectTo="/leases"
            />
            {[...leases]
  .sort((a, b) => {
    const statusOrder: Record<string, number> = {
      ACTIVE: 1,
      UPCOMING: 2,
      ENDED: 3,
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    const propertyDiff = a.property.name.localeCompare(b.property.name);
    if (propertyDiff !== 0) return propertyDiff;

    const unitA = Number(a.unit.number);
    const unitB = Number(b.unit.number);
    if (unitA !== unitB) return unitA - unitB;

    return (
      new Date(b.agreementStartsOn).getTime() -
      new Date(a.agreementStartsOn).getTime()
    );
  })
              .map((lease) => (
                <div
                  id={`lease-${lease.id}`}
                  key={lease.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {lease.tenant.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {lease.tenant.phone}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {lease.property.name} · Unit {lease.unit.number}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                          lease.status
                        )}`}
                      >
                        {lease.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <LeaseActions leaseId={lease.id} status={lease.status} />

                      {lease.status === "ACTIVE" && (
                        <>
                          <ElectricBill
                            leaseId={String(lease.id)}
                            autoOpen={leaseId === lease.id && action === "electricity"}
                          />
                          <PaymentForm
                            leaseId={String(lease.id)}
                            autoOpen={leaseId === lease.id && action === "payment"}
                            embedded={false}
                          />
                        </>
                      )}
                    </div>

                    {lease.status === "ACTIVE" && (
                      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                        <PaymentHistory payments={paymentsByLease.get(lease.id) ?? []} />
                        <ElectricityBillHistory
                          leaseId={String(lease.id)}
                          initialBills={billsByLease.get(lease.id) ?? []}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                        Rent
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(lease.rent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                        Security Deposit
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(lease.securityDeposit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                        Start Date
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatDate(lease.agreementStartsOn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                        End Date
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {lease.agreementEndsOn
                          ? formatDate(lease.agreementEndsOn)
                          : "Open-ended"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}