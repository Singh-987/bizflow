"use client";

import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Unit = {
    id: number;
    number: number;
    type: string;
    rent: number;
    status: string;
    propertyId: number;
}
type Tenant = {
    id: number;
    name: string;
    phone: string;
};
type Lease = {
    id: number;
    tenant: Tenant;
    agreementStartsOn: string;
    agreementEndsOn: string | null;
    rent: number;
    securityDeposit: number;
    status: string;
};
type ElectricityBill = {
    id: number;
    month: string;
    previousReading: number;
    currentReading: number;
    unitsUsed: number;
    perUnitCharge: number;
    electricityBill: number;
    meterchanged: boolean;
}
type Payment = {
    id: number;
    amount: number;
    paidOn: string;
    month: string;
    method: string;
    type: string;
    note: string | null;
}
type RentReminder = {
    leaseId: number;
    month: string;
    dueDate: string;
    balance: number;
    tenantName: string;
}

export default function UnitDetails({
    params,
    searchParams,
}: {
    params: Promise<{ unitId: string }>;
    searchParams: Promise<{ highlight?: string }>;
}) {
    const router = useRouter();
    const [unit, setUnit] = useState<Unit | null>(null);
    const [unitError, setUnitError]= useState("");
    const [leases, setLeases] = useState<Lease[]>([]);
    const [electricity, setElectricity] = useState<ElectricityBill[]>([]);
    const [showLeaseHistory, setShowLeaseHistory] = useState(false);
    const [showElectricHistory, setShowElectricHistory] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [routeParams, setRouteParams] = useState<string | null>(null);
    const [rentReminder, setRentReminder] = useState<RentReminder | null>(null);

    useEffect(() => {
        searchParams.then((query) => {
            const highlight = query.highlight ?? null;

            setRouteParams(highlight);

            if (highlight?.startsWith("electricity-")) {
                setShowElectricHistory(true);
            }
            if (highlight?.startsWith("rent-")) {
                setShowLeaseHistory(true);
            }
        });
    }, [searchParams]);


    useEffect(() => {
        async function loadUnit() {
            const { unitId } = await params;
            const leaseResponse = await fetch(`/api/leases?unitId=${unitId}`);
            if (leaseResponse.ok) {
                const leaseData = await leaseResponse.json();
                setLeases(leaseData);
            }
            const electricityResponse = await fetch(`/api/electricbill?unitId=${unitId}`);
            if (electricityResponse.ok) {
                const electricityData = await electricityResponse.json();
                const unitElectricity = electricityData.flatMap((item: any) => item.bills);
                setElectricity(unitElectricity);
            }
            const paymentResponse = await fetch(`/api/payments?unitId=${unitId}`)
            if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                console.log("UNIT PAYMENT DATA:", paymentData);
                setPayments(
                    paymentData.map((item: any) => ({
                        id: item.id,
                        amount: item.payment.amount,
                        paidOn: item.payment.paidOn,
                        month: item.payment.month,
                        method: item.payment.method,
                        type: item.payment.type,
                        note: item.payment.note,
                    }))
                );
            }
            const response = await fetch(`/api/units?unitId=${unitId}`);
            const text = await response.text();
            console.log("UNIT DETAIL STATUS:", response.status);
            console.log("UNIT DETAIL RESPONSE:", text);
            if (!response.ok) {
    setUnitError(
        response.status === 404
            ? "Unit not found, or you don't have permission to access it."
            : `Unable to load unit (${response.status}). Please try again.`
    );
    return;
}

const data = JSON.parse(text);
setUnit(data);
setUnitError("");
        }
        loadUnit();
    }, [params]);
    if (!unit) {
    if (unitError) {
        return (
            <AppShell>
                <div className="p-6">
                    <h2 className="text-lg font-semibold">
                        Unable to load unit
                    </h2>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {unitError}
                    </p>

                    <button
                        onClick={() => router.back()}
                        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </AppShell>
        );
    }

    return <AppShell>Loading Unit...</AppShell>;
}
    const rentParts = routeParams?.startsWith("rent-")
        ? routeParams?.split("-")
        : [];
    const rentLeaseId = Number(rentParts[1]);
    const rentMonth = rentParts.length === 4
        ? `${rentParts[2]}-${rentParts[3]}`
        : "";
    const selectedLease = leases.find((lease) => lease.id === rentLeaseId);
    const rentPaid = payments.filter((payment) =>
        payment.type === "RENT" &&
        payment.month === rentMonth &&
        leases.some((lease) => lease.id === rentLeaseId)
    )
        .reduce((total, payment) => total + Number(payment.amount), 0);
    const rentBalance = selectedLease
        ? Math.max(0, Number(selectedLease.rent) - rentPaid)
        : 0;
    let rentDueDate = "";
    if (selectedLease && rentMonth) {
        const [year, month] = rentMonth.split("-").map(Number);
        const startDay = Number(selectedLease.agreementStartsOn.slice(8, 10));
        const lastDay = new Date(year, month, 0).getDate();
        rentDueDate =
            `${year}-` +
            `${String(month).padStart(2, "0")}-` +
            `${String(Math.min(startDay, lastDay)).padStart(2, "0")}`;
    }

    return (
        <AppShell>
            <LeaseHighlight
                targetId={routeParams}
            />
            <main className="mx-auto w-full max-w-6xl space-y-6">
                <button
type="button"
onClick={() => {
window.location.href = `/properties/${unit.propertyId}/units`;
}}
className="text-sm text-blue-600 hover:underline dark:text-blue-400"

>


← Back


</button>

                {routeParams?.startsWith("rent-") && (<div
                    className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
                >
                    <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
                        Rent Payment Reminder </h2>


                    {selectedLease ? (
                        <>
                            <p className="mt-2">
                                Tenant: {selectedLease.tenant.name}
                            </p>

                            <p>
                                Rent Month: {rentMonth}
                            </p>

                            <p>
                                Monthly Rent: ₹
                                {Number(selectedLease.rent).toLocaleString("en-IN")}
                            </p>

                            <p>
                                Amount Outstanding: ₹
                                {rentBalance.toLocaleString("en-IN")}
                            </p>

                            <p>
                                Due Date: {rentDueDate}
                            </p>

                            <p className="mt-2 font-medium">
                                {rentBalance > 0
                                    ? "Rent payment is pending."
                                    : "This month's rent is fully paid."}
                            </p>
                        </>
                    ) : (
                        <p className="mt-2">
                            Loading the selected lease details, or the lease
                            could not be found.
                        </p>
                    )}
                </div>


                )}

                <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Property #{unit.propertyId}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Unit {unit.number}
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Unit details, tenancy, and financial history
            </p>
        </div>

        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${
            unit.status === "OCCUPIED"
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        }`}>
            {unit.status}
        </span>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Unit Type
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {unit.type}
            </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Monthly Rent
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                ₹{Number(unit.rent).toLocaleString("en-IN")}
            </p>
        </div>
    </div>
</header>
                <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <button
                        type="button"
                        onClick={() => router.push(`/leases/create?unitId=${unit.id}`)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Create New Lease
                    </button>

                    {leases
                        .filter((lease) => lease.status === "ACTIVE")
                        .map((lease) => (
                            <div
                                key={lease.id}
                                className="flex flex-wrap gap-2"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            `/leases?leaseId=${lease.id}&unitId=${unit.id}&propertyId=${unit.propertyId}`
                                        )
                                    }
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    View Lease
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            `/leases?leaseId=${lease.id}&action=payment&unitId=${unit.id}&propertyId=${unit.propertyId}`
                                        )
                                    }
                                    className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                                >
                                    Record Payment
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            `/leases?leaseId=${lease.id}&action=electricity&unitId=${unit.id}&propertyId=${unit.propertyId}`
                                        )
                                    }
                                    className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                                >
                                    Add Electricity Bill
                                </button>
                            </div>
                        ))}
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
    Lease History
</h2>

                    {leases.length === 0 ? (
                        <p>No leases found</p>
                    ) : (
                        <>
                            {[...leases]
                                .sort((a, b) => {
                                    if (
                                        a.status === "ACTIVE" &&
                                        b.status !== "ACTIVE"
                                    ) {
                                        return -1;
                                    }

                                    if (
                                        a.status !== "ACTIVE" &&
                                        b.status === "ACTIVE"
                                    ) {
                                        return 1;
                                    }

                                    return (
                                        new Date(b.agreementStartsOn).getTime() -
                                        new Date(a.agreementStartsOn).getTime()
                                    );
                                })
                                .map((lease) => {
                                    const isActive =
                                        lease.status === "ACTIVE";

                                    if (
                                        !isActive &&
                                        !showLeaseHistory
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={lease.id}
                                            className={
                                                isActive
                                                    ? "rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
                                                    : "mt-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900"
                                            }
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {lease.tenant.name}
                                                </p>

                                                <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
        lease.status === "ACTIVE"
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
            : lease.status === "UPCOMING"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
    }`}
>
    {lease.status}
</span>
                                            </div>

                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                {lease.tenant.phone}
                                            </p>

                                            <div className="mt-2 grid gap-1 text-sm text-gray-700 sm:grid-cols-2 dark:text-gray-300">
                                                <p>
                                                    Start:{" "}
                                                    {lease.agreementStartsOn}
                                                </p>

                                                <p>
                                                    End:{" "}
                                                    {lease.agreementEndsOn ||
                                                        "Open-ended"}
                                                </p>

                                                <p>
                                                    Rent: {lease.rent}
                                                </p>

                                                <p>
                                                    Deposit:{" "}
                                                    {lease.securityDeposit}
                                                </p>
                                            </div>

                                            {isActive && (
                                                <p className="mt-2 text-xs font-semibold text-green-700 dark:text-green-300">
                                                    Current Active Lease
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                            {leases.some(
                                (lease) => lease.status !== "ACTIVE"
                            ) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowLeaseHistory(
                                                !showLeaseHistory
                                            )
                                        }
                                        className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                        {showLeaseHistory
                                            ? "Hide Lease History"
                                            : "View Lease History"}
                                    </button>
                                )}
                        </>
                    )}
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
    Electricity History
</h2>
                    {electricity.length === 0 ? (
                        <p>No Electricity bills found.</p>
                    ) : (
                        <>
                            {[...electricity]
                                .sort((a, b) => b.month.localeCompare(a.month))
                                .map((bill, index) => {
                                    if (
                                        index > 0 &&
                                        !showElectricHistory &&
                                        routeParams !== `electricity-${bill.id}`
                                    ) {
                                        return null;
                                    }
                                    return (
                                        <div
    id={`electricity-${bill.id}`}
    key={bill.id}
    className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
                                            <p>
                                                Month: {bill.month}
                                            </p>
                                            <p>
                                                Reading: {""}{bill.previousReading}
                                                {"→"}
                                                {bill.currentReading}
                                            </p>
                                            <p>
                                                Units Used: {""}
                                                {bill.unitsUsed}
                                            </p>
                                            <p>
                                                Rate: {bill.perUnitCharge}
                                            </p>
                                            <p>
                                                Bill: {""}
                                                {bill.electricityBill}
                                            </p>
                                        </div>
                                    );
                                })
                            }
                            {electricity.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setShowElectricHistory(!showElectricHistory)}
                                    className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    {showElectricHistory ? "Hide Electricity History" : "View Electricity History"}
                                </button>
                            )}
                        </>
                    )
                    }
                </div>
                <div className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
    Recent Payments
</h2>
                    {payments.length === 0 ? (
                        <p>No Payments found.</p>
                    ) : (
                        <>
                            {[...payments]
                                .sort((a, b) => new Date(b.paidOn).getTime() -
                                    new Date(a.paidOn).getTime()
                                )
                                .slice(0, 3)
                                .map((payment) => (
                                    <div
    key={payment.id}
    className="mt-2 rounded-lg border border-gray-200 p-3"
>
                                        <div className="flex flex-wrap items-center gap-2"
                                        >
                                            <p className="font-semibold text-gray-900 dark:text-white">
    ₹{Number(payment.amount).toLocaleString("en-IN")}
</p>
                                            <span className="text-sm font-medium">
                                                {payment.type}
                                            </span>
                                        </div>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            <p>
                                                Month: {payment.month}
                                            </p>
                                            <p>
                                                Paid On: {""}
                                                {payment.paidOn}
                                            </p>
                                            <p>
                                                Method: {payment.method}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            }
                        </>
                    )
                    }
                </div>
            </main>
        </AppShell>
    )
}