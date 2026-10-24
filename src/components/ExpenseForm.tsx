"use client";

import { useEffect, useState } from "react";

export default function ExpenseForm() {
    const [showExpense, setShowExpense] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDate, setExpenseDate] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expenseNote, setExpenseNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [propertyId, setPropertyId] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function loadProperties() {
            try {
                const response = await fetch("/api/properties");

                if (!response.ok) {
                    throw new Error("Failed to load properties.");
                }

                const data = await response.json();
                setProperties(data);
            } catch (error) {
                console.error("LOAD PROPERTIES ERROR:", error);
                setError("Unable to load properties. Please try again.");
            }
        }

        loadProperties();
    }, []);

    function resetForm() {
        setPropertyId("");
        setExpenseAmount("");
        setExpenseDate("");
        setExpenseCategory("");
        setExpenseNote("");
        setError("");
        setSuccess("");
    }

    async function addExpense() {
        setError("");
        setSuccess("");

        if (
            !propertyId ||
            !expenseAmount ||
            !expenseDate ||
            !expenseCategory.trim()
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!Number.isFinite(Number(expenseAmount)) || Number(expenseAmount) <= 0) {
            setError("Enter an amount greater than zero.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    propertyId: Number(propertyId),
                    amount: Number(expenseAmount),
                    date: expenseDate,
                    category: expenseCategory.trim(),
                    note: expenseNote.trim() || null,
                }),
            });

            const text = await response.text();

            if (!response.ok) {
                setError(
                    `Unable to save expense. ${
                        text || `Error ${response.status}`
                    }`
                );
                return;
            }

            resetForm();
            setSuccess("Expense added successfully.");

            // Refresh the expense list after saving.
            window.location.reload();
        } catch (error) {
            console.error("ADD EXPENSE ERROR:", error);
            setError("Something went wrong while saving the expense.");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "mt-1.5 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900";

    const labelClass =
        "block text-sm font-medium text-slate-700 dark:text-slate-300";

    return (
        <section className="w-full">
            {!showExpense ? (
                <button
                    type="button"
                    onClick={() => {
                        setShowExpense(true);
                        setError("");
                        setSuccess("");
                    }}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-950"
                >
                    <span aria-hidden="true" className="text-lg leading-none">
                        +
                    </span>
                    Add Expense
                </button>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Add New Expense
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Record a property-related expense.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowExpense(false);
                            }}
                            disabled={loading}
                            aria-label="Close expense form"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            ×
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className={labelClass}>
                                Property <span className="text-red-500">*</span>
                            </label>

                            <select
                                value={propertyId}
                                onChange={(e) => setPropertyId(e.target.value)}
                                disabled={loading}
                                className={inputClass}
                                required
                            >
                                <option value="">Select property</option>

                                {properties.map((property) => (
                                    <option
                                        key={property.id}
                                        value={property.id}
                                    >
                                        {property.name}
                                    </option>
                                ))}
                            </select>

                            {properties.length === 0 && (
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    No properties available. Add a property first.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass}>
                                Amount (₹) <span className="text-red-500">*</span>
                            </label>

                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Enter amount"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                disabled={loading}
                                className={inputClass}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Expense date <span className="text-red-500">*</span>
                            </label>

                            <input
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                disabled={loading}
                                className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Category <span className="text-red-500">*</span>
                            </label>

                            <input
                                type="text"
                                placeholder="e.g. Repairs, Maintenance"
                                value={expenseCategory}
                                onChange={(e) =>
                                    setExpenseCategory(e.target.value)
                                }
                                disabled={loading}
                                className={inputClass}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className={labelClass}>
                                Note <span className="font-normal text-slate-400">(optional)</span>
                            </label>

                            <input
                                type="text"
                                placeholder="Add details about this expense"
                                value={expenseNote}
                                onChange={(e) => setExpenseNote(e.target.value)}
                                disabled={loading}
                                className={inputClass}
                                maxLength={500}
                            />
                        </div>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                        >
                            {error}
                        </p>
                    )}

                    {success && (
                        <p
                            role="status"
                            className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
                        >
                            {success}
                        </p>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowExpense(false);
                            }}
                            disabled={loading}
                            className="min-h-11 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={addExpense}
                            disabled={loading || properties.length === 0}
                            className="min-h-11 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Expense"}
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Fields marked with * are required.
                    </p>
                </div>
            )}
        </section>
    );
}