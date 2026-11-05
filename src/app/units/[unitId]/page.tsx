"use client";

import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Unit = {
  id: number;
  number: number;
  type: string;
  rent: number;
  status: string;
  propertyId: number;
};

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
};

type Payment = {
  id: number;
  amount: number;
  paidOn: string;
  month: string;
  method: string;
  type: string;
  note: string | null;
};

export default function UnitDetails({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitError, setUnitError] = useState("");
  const [leases, setLeases] = useState<Lease[]>([]);
  const [electricity, setElectricity] = useState<ElectricityBill[]>([]);
  const [showLeaseHistory, setShowLeaseHistory] = useState(false);
  const [showElectricHistory, setShowElectricHistory] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routeParams, setRouteParams] = useState<string | null>(null);

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

  // Parallelized Data Loading (Eliminates the 4-step waterfall)
  useEffect(() => {
    let cancelled = false;

    async function loadUnitData() {
      try {
        const { unitId } = await params;

        const [leaseRes, electricRes, paymentRes, unitRes] = await Promise.all([
          fetch(`/api/leases?unitId=${unitId}`),
          fetch(`/api/electricbill?unitId=${unitId}`),
          fetch(`/api/payments?unitId=${unitId}`),
          fetch(`/api/units?unitId=${unitId}`),
        ]);

        if (!unitRes.ok) {
          if (!cancelled) {
            setUnitError(
              unitRes.status === 404
                ? "Unit not found, or you don't have permission to access it."
                : `Unable to load unit (${unitRes.status}). Please try again.`
            );
          }
          return;
        }

        const [leaseData, electricData, paymentData, unitData] = await Promise.all([
          leaseRes.ok ? leaseRes.json() : [],
          electricRes.ok ? electricRes.json() : [],
          paymentRes.ok ? paymentRes.json() : [],
          unitRes.json(),
        ]);

        if (cancelled) return;

        setLeases(Array.isArray(leaseData) ? leaseData : []);
        setUnit(unitData);
        setUnitError("");

        const unitElectricity = Array.isArray(electricData)
          ? electricData.flatMap((item: any) => item.bills || [])
          : [];
        setElectricity(unitElectricity);

        if (Array.isArray(paymentData)) {
          setPayments(
            paymentData.map((item: any) => ({
              id: item.id,
              amount: item.payment?.amount ?? 0,
              paidOn: item.payment?.paidOn ?? "",
              month: item.payment?.month ?? "",
              method: item.payment?.method ?? "",
              type: item.payment?.type ?? "",
              note: item.payment?.note ?? null,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("LOAD UNIT ERROR:", err);
          setUnitError("An unexpected error occurred while loading unit details.");
        }
      }
    }

    loadUnitData();

    return () => {
      cancelled = true;
    };
  }, [params]);

  function handleNavigate(url: string, actionKey: string) {
    setNavigatingAction(actionKey);
    startTransition(() => {
      router.push(url);
    });
  }

  if (!unit) {
    if (unitError) {
      return (
        <AppShell>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Unable to load unit
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {unitError}
            </p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
            >
              Go Back
            </button>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <div className="flex items-center gap-3 p-8 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading Unit Details...</span>
        </div>
      </AppShell>
    );
  }

  const rentParts = routeParams?.startsWith("rent-") ? routeParams.split("-") : [];
  const rentLeaseId = Number(rentParts[1]);
  const rentMonth = rentParts.length === 4 ? `${rentParts[2]}-${rentParts[3]}` : "";
  const selectedLease = leases.find((lease) => lease.id === rentLeaseId);

  const rentPaid = payments
    .filter(
      (payment) =>
        payment.type === "RENT" &&
        payment.month === rentMonth &&
        leases.some((l) => l.id === rentLeaseId)
    )
    .reduce((total, p) => total + Number(p.amount), 0);

  const rentBalance = selectedLease
    ? Math.max(0, Number(selectedLease.rent) - rentPaid)
    : 0;

  let rentDueDate = "";
  if (selectedLease && rentMonth) {
    const [year, month] = rentMonth.split("-").map(Number);
    const startDay = Number(selectedLease.agreementStartsOn.slice(8, 10));
    const lastDay = new Date(year, month, 0).getDate();
    rentDueDate = `${year}-${String(month).padStart(2, "0")}-${String(
      Math.min(startDay, lastDay)
    ).padStart(2, "0")}`;
  }

  return (
    <AppShell>
      <LeaseHighlight targetId={routeParams} />

      <main className="mx-auto w-full max-w-6xl space-y-6">
        <Link
          href={`/properties/${unit.propertyId}/units`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:underline active:scale-[0.98] dark:text-blue-400"
        >
          ← Back to Units
        </Link>

        {/* Rent Reminder Notification */}
        {routeParams?.startsWith("rent-") && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/60">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
              Rent Payment Reminder
            </h2>
            {selectedLease ? (
              <div className="mt-3 space-y-1.5 text-sm text-amber-900 dark:text-amber-200">
                <p><span className="font-medium">Tenant:</span> {selectedLease.tenant.name}</p>
                <p><span className="font-medium">Rent Month:</span> {rentMonth}</p>
                <p><span className="font-medium">Monthly Rent:</span> ₹{Number(selectedLease.rent).toLocaleString("en-IN")}</p>
                <p><span className="font-medium">Amount Outstanding:</span> ₹{rentBalance.toLocaleString("en-IN")}</p>
                <p><span className="font-medium">Due Date:</span> {rentDueDate ? formatDate(rentDueDate) : "N/A"}</p>
                <p className="pt-2 font-semibold">
                  {rentBalance > 0
                    ? "Rent payment is currently pending."
                    : "This month's rent is fully settled."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                Selected lease details could not be retrieved.
              </p>
            )}
          </div>
        )}

        {/* Unit Summary Header */}
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
                Unit configuration, tenancy status, and payment records.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                unit.status === "OCCUPIED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              }`}
            >
              {unit.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Unit Type</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{unit.type}</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Default Monthly Rent</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                ₹{Number(unit.rent).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </header>

        {/* Action Buttons Toolbar */}
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => handleNavigate(`/leases/create?unitId=${unit.id}`, "create-lease")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
          >
            {isPending && navigatingAction === "create-lease" ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Opening...</span>
              </>
            ) : (
              "+ Create New Lease"
            )}
          </button>

          {leases
            .filter((lease) => lease.status === "ACTIVE")
            .map((lease) => (
              <div key={lease.id} className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleNavigate(
                      `/leases?leaseId=${lease.id}&unitId=${unit.id}&propertyId=${unit.propertyId}`,
                      `view-lease-${lease.id}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isPending && navigatingAction === `view-lease-${lease.id}` ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Loading Lease...</span>
                    </>
                  ) : (
                    "View Lease"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleNavigate(
                      `/leases?leaseId=${lease.id}&action=payment&unitId=${unit.id}&propertyId=${unit.propertyId}`,
                      `record-payment-${lease.id}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950"
                >
                  {isPending && navigatingAction === `record-payment-${lease.id}` ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Loading Form...</span>
                    </>
                  ) : (
                    "Record Payment"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleNavigate(
                      `/leases?leaseId=${lease.id}&action=electricity&unitId=${unit.id}&propertyId=${unit.propertyId}`,
                      `add-electric-${lease.id}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/50 px-3.5 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 active:scale-[0.98] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950"
                >
                  {isPending && navigatingAction === `add-electric-${lease.id}` ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Loading Bill...</span>
                    </>
                  ) : (
                    "Add Electricity Bill"
                  )}
                </button>
              </div>
            ))}
        </section>

        {/* Lease History Section */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lease History
          </h2>

          {leases.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No leases associated with this unit yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {[...leases]
                .sort((a, b) => {
                  if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
                  if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
                  return (
                    new Date(b.agreementStartsOn).getTime() -
                    new Date(a.agreementStartsOn).getTime()
                  );
                })
                .map((lease) => {
                  const isActive = lease.status === "ACTIVE";

                  if (!isActive && !showLeaseHistory) {
                    return null;
                  }

                  return (
                    <div
                      key={lease.id}
                      className={`rounded-xl border p-4 transition ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/30"
                          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {lease.tenant?.name || "Unknown Tenant"}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            lease.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : lease.status === "UPCOMING"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {lease.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {lease.tenant?.phone || "No phone provided"}
                      </p>

                      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4 dark:text-gray-300">
                        <div>
                          <p className="text-xs text-gray-400">Start Date</p>
                          <p className="font-medium">{formatDate(lease.agreementStartsOn)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">End Date</p>
                          <p className="font-medium">
                            {lease.agreementEndsOn ? formatDate(lease.agreementEndsOn) : "Open-ended"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Agreed Rent</p>
                          <p className="font-medium">₹{Number(lease.rent).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Deposit</p>
                          <p className="font-medium">₹{Number(lease.securityDeposit).toLocaleString("en-IN")}</p>
                        </div>
                      </div>

                      {isActive && (
                        <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          ✓ Current Active Lease
                        </p>
                      )}
                    </div>
                  );
                })}

              {leases.some((l) => l.status !== "ACTIVE") && (
                <button
                  type="button"
                  onClick={() => setShowLeaseHistory(!showLeaseHistory)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {showLeaseHistory ? "Hide Past Leases" : "View Lease History"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Electricity Bills Section */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Electricity History
          </h2>

          {electricity.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No electricity bills found for this unit.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
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
                      className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-xs text-gray-400">Billing Month</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{bill.month}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Meter Reading</p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {bill.previousReading} → {bill.currentReading}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Units Consumed</p>
                          <p className="text-gray-700 dark:text-gray-300">{bill.unitsUsed} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Rate / Unit</p>
                          <p className="text-gray-700 dark:text-gray-300">₹{bill.perUnitCharge}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Bill Total</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            ₹{Number(bill.electricityBill).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {electricity.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowElectricHistory(!showElectricHistory)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {showElectricHistory ? "Hide Electricity History" : "View Electricity History"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Recent Payments Section */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Payments
          </h2>

          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No payments recorded for this unit.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {[...payments]
                .sort(
                  (a, b) =>
                    new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime()
                )
                .slice(0, 5)
                .map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          ₹{Number(payment.amount).toLocaleString("en-IN")}
                        </p>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {payment.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        Method: {payment.method}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2 dark:text-gray-400">
                      <p>Billing Month: <span className="font-medium text-gray-800 dark:text-gray-200">{payment.month}</span></p>
                      <p>Date Paid: <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(payment.paidOn)}</span></p>
                    </div>

                    {payment.note && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Note: {payment.note}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}