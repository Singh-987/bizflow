"use client";

import { useEffect, useState } from "react";
import PaymentForm from "@/components/PaymentForm";

type Lease = {
    id: number;
    tenant: {
        name: string;
    };
    property: {
        name: string;
    };
    unit: {
        number: string | number;
    };
    rent: number;
    status: string;
};

export default function PaymentsPageForm() {
    const [leases, setLeases] = useState<Lease[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState("");
    const [showPaymentForm, setShowPaymentForm]= useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadLeases() {
            try {
                const response = await fetch("/api/leases", {
                    cache: "no-store",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to load leases."
                    );
                }

                setLeases(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load leases."
                );
            } finally {
                setLoading(false);
            }
        }

        loadLeases();
    }, []);

    const selectedLease = leases.find(
        (lease) => String(lease.id) === selectedLeaseId
    );

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Payment
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select a lease and record a rent or electricity payment.
            </p>

            {loading ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    Loading leases...
                </p>
            ) : error ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : leases.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    No leases found. Create a lease before recording a payment.
                </p>
            ) : (
                <div className="mt-4 space-y-4">
                    <div>
                        <label
                            htmlFor="payment-lease"
                            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            Select Lease
                        </label>

                        <select
                            id="payment-lease"
                            value={selectedLeaseId}
                            onChange={(event) =>
                                setSelectedLeaseId(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                            <option value="">
                                Choose tenant and unit
                            </option>

                            {leases.map((lease) => (
                                <option
                                    key={lease.id}
                                    value={lease.id}
                                >
                                    {lease.tenant.name} ·{" "}
                                    {lease.property.name} · Unit{" "}
                                    {lease.unit.number} · {lease.status}
                                </option>
                            ))}
                        </select>
                    </div>

                 {selectedLease && (
    <>
        {selectedLease.status.toUpperCase() === "ENDED" && (
            <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40"
            >
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                    ⚠️ This lease has ended
                </p>

                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    You are recording a payment against an ended lease.
                    Continue only if this payment relates to an outstanding
                    balance or a payment received after the tenancy ended.
                </p>
            </div>
        )}

        <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-300">
                Monthly rent:{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{Number(selectedLease.rent).toLocaleString("en-IN")}
                </span>
            </p>

            <p className="mt-1 text-slate-500 dark:text-slate-400">
                Lease status: {selectedLease.status}
            </p>
        </div>

        {!showPaymentForm ? (
            <button
                type="button"
                onClick={() => setShowPaymentForm(true)}
                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
                Add Payment
            </button>
        ) : (
            <PaymentForm
                key={selectedLease.id}
                leaseId={String(selectedLease.id)}
                autoOpen
                embedded
            />
        )}
    </>
)}
                </div>
            )}
        </section>
    );
}