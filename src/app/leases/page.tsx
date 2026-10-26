import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LeaseActions from "../../components/LeaseActions";
import ElectricBill from "../../components/electricbill";
import PaymentForm from "../../components/PaymentForm";
import PaymentHistory from "@/components/PaymentHistory";
import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import ElectricityBillHistory from "@/components/ElectricBillHistory";

type Lease = {
    id: number;
    tenant: {
        id: number;
        name: string;
        phone: string;
    };
    property: {
        id: number;
        name: string;
    };
    unit: {
        id: number;
        number: number;
        type: string;
    };
    agreementStartsOn: string;
    agreementEndsOn: string | null;
    rent: number;
    securityDeposit: number;
    status: string;
};


async function getLeases(): Promise<Lease[]> {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) return [];

    const response = await fetch(`${protocol}://${host}/api/leases`, {
        cache: "no-store",
        headers: {
            Cookie: requestHeaders.get("cookie") ?? "",
        },
    });

    if (!response.ok) return [];

    return response.json();
}


async function getPayments() {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    if (!host) return [];

    const response = await fetch(`${protocol}://${host}/api/payments`, {
        cache: "no-store",
        headers: {
            Cookie: requestHeaders.get("cookie") ?? "",
        },
    });

    if (!response.ok) return [];

    return response.json();
}

export default async function LeasesPage({ searchParams, }: {
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
    const propertyId = params.propertyId;
    const leaseId = params.leaseId
        ? Number(params.leaseId)
        : null;
        const action = params.action;
    const [leases, payments] = await Promise.all([
getLeases(),
getPayments(),
]);


    return (
        <AppShell>
            <div>
               <div className="mb-8">
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Leases
    </h1>
        {unitId && (
    <a
        href={`/units/${unitId}`}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
    >
        ← Back to Unit Details
    </a>
)}

    <p className="mt-2 text-slate-600 dark:text-slate-400">
        Manage your active and previous rental agreements.
    </p>

    <a
        href="/leases/create"
        className="mt-4 inline-flex items-center justify-center rounded-lg
            bg-slate-900 px-4 py-2.5 text-sm font-medium text-white
            transition hover:bg-slate-800
            dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    >
        + Create Lease
    </a>
</div>

                {leases.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            No leases yet
                        </h2>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Create a lease from a property unit to see it here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <LeaseHighlight
                            targetId={leaseId ? `lease-${leaseId}` : null}
                            redirectTo="/leases"
                        />
                        {leases
                            .sort((a, b) => {
                                const statusOrder: Record<string, number> = {
                                    ACTIVE: 1,
                                    UPCOMING: 2,
                                    ENDED: 3,
                                };
                                const statusDiff =
                                    statusOrder[a.status] -
                                    statusOrder[b.status];
                                if (statusDiff !== 0)
                                    return statusDiff;
                                const propertyDiff =
                                    a.property.name.localeCompare(b.property.name);
                                if (propertyDiff !== 0)
                                    return propertyDiff;
                                const unitA = Number(a.unit.number);
                                const unitB = Number(b.unit.number);
                                if (unitA !== unitB) {
                                    return unitA - unitB
                                }
                                return (
                                    new Date(b.agreementStartsOn).getTime() -
                                    new Date(a.agreementStartsOn).getTime()
                                );
                            })

                            .map((lease) => (
                                <div
                                    id={`lease-${lease.id}`}
                                    key={lease.id}
                                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                                >
                                    <div className="flex flex-col gap-5">
    {/* Tenant and lease status */}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {lease.tenant.name}
            </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lease.tenant.phone}
        </p>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {lease.property.name} · Unit {lease.unit.number}
        </p>
    </div>

    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {lease.status}
    </span>
</div>

{/* Lease actions */}
<div className="flex flex-wrap items-center gap-2">
    <LeaseActions
        leaseId={lease.id}
        status={lease.status}
    />

    {lease.status === "ACTIVE" && (
        <>
            <ElectricBill leaseId={String(lease.id)}
                autoOpen={
                    leaseId=== lease.id &&
                    action === "electricity"
                }
            />
            <PaymentForm leaseId={String(lease.id)}
                autoOpen={
                    leaseId === lease.id &&
                    action === "payment"
                }
                embedded={false}
            />
        </>
    )}
</div>

{/* Payment history */}
{lease.status === "ACTIVE" && (
    <div
        className="
            grid min-w-0 grid-cols-1
            gap-4 xl:grid-cols-2
        "
    >
        <PaymentHistory
            payments={payments.filter(
                (item: any) =>
                    item.lease.id === lease.id
            )}
        />

        <ElectricityBillHistory
            leaseId={String(lease.id)}
        />
    </div>
)}


</div>


                                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                                Rent
                                            </p>

                                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                                ₹{lease.rent}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                                Security Deposit
                                            </p>

                                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                                ₹{lease.securityDeposit}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                                Start Date
                                            </p>

                                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                                {lease.agreementStartsOn}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                                End Date
                                            </p>

                                            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                                {lease.agreementEndsOn ?? "Open-ended"}
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