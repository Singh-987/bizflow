"use client";

import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function DashboardContent() {
    const [month, setMonth] = useState(() => {
        return new Date().toISOString().slice(0, 7);
    });
    const [financials, setFinancials] = useState<any>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [leases, setLeases] = useState<any[]>([]);
    const [payments, setPayments]= useState<any[]>([]);

    const totalProperties = properties.length;
    const totalUnits = units.length;
    const occupiedUnits = units.filter(
        (unit) => unit.status === "OCCUPIED"
    ).length;
    const vacantUnits = units.filter(
        (unit) => unit.status === "VACANT"
    ).length;
    const propertySummaries = properties.map((property) => {
        const propertyUnits = units.filter(
            (unit) => unit.propertyId === property.id
        );
        return {
            ...property,
            totalUnits: propertyUnits.length,
            occupiedUnits: propertyUnits.filter(
                (unit) => unit.status === "OCCUPIED"
            ).length,
            vacantUnits: propertyUnits.filter(
                (unit) => unit.status === "VACANT"
            ).length,
        };
    });
    const occupancyRate =
        totalUnits > 0
            ? Math.round((occupiedUnits / totalUnits) * 100)
            : 0;

    const totalTenants = tenants.length;
    const activeLeases = leases.filter((lease) => lease.status === "ACTIVE").length;
    const collectionRate =
        financials && financials.totalDue > 0
            ? Math.round(
                (financials.paymentsReceived / financials.totalDue) * 100
            )
            : 0;
    const recentPayments= [...payments]
            .sort(
                (a,b)=>
                    new Date(b.payment.paidOn).getTime()-
                    new Date(a.payment.paidOn).getTime()
            )
            .slice(0, 5);
    const activeLeaseList= leases.filter(
        (lease)=> lease.status === "ACTIVE"
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dataError, setDataError]= useState("");
    const formatCurrency = (amount: number | string | null | undefined) =>
    `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

    useEffect(() => {
        async function loadFinancials() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/financials?month=${month}`
                );

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to load financial data.");
                }
                setFinancials(data);
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }
        loadFinancials();
    }, [month]);
    useEffect(() => {
        async function loadProperties() {
            try {
                const response = await fetch("/api/properties");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to load properties.");
                }
                setProperties(data);
            } catch (error) {
                console.error("LOAD PROPERTIES ERROR:", error);
            }
        }
        loadProperties();
    }, [])
    useEffect(() => {
        async function loadUnits() {
            try {
                const allUnits: any[] = [];

                for (const property of properties) {
                    const response = await fetch(
                        `/api/units?propertyId=${property.id}`
                    );
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(
                            data.error || "Failed to load Units."
                        );
                    }
                    allUnits.push(...data);
                }
                setUnits(allUnits);
            } catch (error) {
                setDataError(
    error instanceof Error
        ? error.message
        : "Failed to load dashboard data."
);
            }
        }
        if (properties.length > 0) {
            loadUnits();
        }
    }, [properties]);

    useEffect(() => {
        async function loadTenants() {
            try {
                const response = await fetch("/api/tenants");
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to load tenants.");
                }
                setTenants(data);
            } catch (error) {
                setDataError(
    error instanceof Error
        ? error.message
        : "Failed to load dashboard data."
);
            }
        }
        loadTenants();
    }, [])

    useEffect(() => {
        async function loadLeases() {
            try {
                const response = await fetch("/api/leases");
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || "Failed to load leases.");
                }
                setLeases(data);
            } catch (error) {
                setDataError(
    error instanceof Error
        ? error.message
        : "Failed to load dashboard data."
);
            }
        }
        loadLeases();
    }, [])

    useEffect(()=>{
        async function loadPayments(){
            try{
                const response= await fetch("/api/payments");
                const data= await response.json();
                if(!response.ok){
                    throw new Error(
                        data.error || "Failed to load payments"
                    );
                }
                setPayments(data);
            }catch(error){
                setDataError(
    error instanceof Error
        ? error.message
        : "Failed to load dashboard data."
);
            }
        }
        loadPayments();
    },[])
    return (
        <div>
            {dataError && (
    <p
        role="alert"
        className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
        {dataError}
    </p>
)}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Financial Overview
                    </p>
                </div>

                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-auto [color-scheme:light] dark:[color-scheme:dark]"
                />
            </div>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Properties</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalProperties}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Units</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalUnits}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Occupied</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {occupiedUnits}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Vacant</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {vacantUnits}
                    </p>
                </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Tenants</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {totalTenants}
                </p>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Active Leases</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {activeLeases}
                </p>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Property Overview
                    </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
    {propertySummaries.length === 0 ? (
        <p className="p-5 text-sm text-slate-500 dark:text-slate-400">
            No properties added yet.
        </p>
    ) : (
        propertySummaries.map((property) => (
                        <div
                            key={property.id}
                            className="grid gap-4 p-5 sm:grid-cols-4">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {property.name}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {property.address}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Units</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                    {property.totalUnits}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Occupied</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                    {property.occupiedUnits}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Vacant</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                    {property.vacantUnits}
                                </p>
                            </div>
                        </div>
                    )))}
                </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Recent Payments
                    </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentPayments.length === 0 ?(
                        <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
                        No Payments recorded yet.
                        </div>
                    ):(
                        recentPayments.map((item)=>(
                            <div
                                key={item.id}
                                className="grid gap-4 p-5 sm:grid-cols-5"
                            >
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                        {item.tenant.name}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {item.property.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Amount</p>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                         {formatCurrency(item.payment.amount)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Month</p>
                                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                                        {item.payment.month}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Paid On</p>
                                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                                        {formatDate(item.payment.paidOn)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )
                    }
                </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Active Lease Overview
                    </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {activeLeaseList.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
                        No Active leases.

                </div>
                ):(
                    activeLeaseList.map((lease)=>(
                        <div
                            key={lease.id}
                            className="grid gap-4 p-5 sm:grid-cols-5"
                        >
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Tenant
                                </p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                    {lease.tenant.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Property
                                </p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                    {lease.property.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Unit
                                </p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                    {lease.unit.number}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Rent
                                </p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(lease.rent)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Lease End
                                </p>
                                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                                    {lease.agreementEndsOn
    ? formatDate(lease.agreementEndsOn)
    : "No end date"}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Occupancy Rate</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {occupancyRate}%
                    </p>
                </div>
            </div>
            <div className="mt-6">
                {loading && <p className="text-sm text-slate-500 dark:text-slate-400"> Loading financial data...</p>}
                {error && (
                    <p className="text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}
                {!loading && !error && financials && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Rent Due</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.rentDue)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Electricity Due</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.electricityDue)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Due</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.totalDue)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Payments Received</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.paymentsReceived)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Collection Rate
                            </p>
                            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {collectionRate}%
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.outstanding)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Expenses</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.expenses)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Net Income</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(financials.netIncome)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}