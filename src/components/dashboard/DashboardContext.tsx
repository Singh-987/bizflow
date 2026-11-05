"use client";

import { formatDate } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export default function DashboardContent() {
  const [month, setMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const [financials, setFinancials] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataError, setDataError] = useState("");

  const financialSectionRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number | string | null | undefined) =>
    `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

  const formatSelectedMonth = (monthString: string) => {
    try {
      const [year, m] = monthString.split("-");
      const date = new Date(Number(year), Number(m) - 1, 1);
      return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } catch {
      return monthString;
    }
  };

  // 1. Initial Dashboard Data Load (Parallelized without N+1 waterfall)
  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setInitialLoading(true);
      setDataError("");

      try {
        const [propsRes, tenantsRes, leasesRes, paymentsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/tenants"),
          fetch("/api/leases"),
          fetch("/api/payments"),
        ]);

        if (!propsRes.ok || !tenantsRes.ok || !leasesRes.ok || !paymentsRes.ok) {
          throw new Error("Failed to load initial dashboard metrics.");
        }

        const [propsData, tenantsData, leasesData, paymentsData] = await Promise.all([
          propsRes.json(),
          tenantsRes.json(),
          leasesRes.json(),
          paymentsRes.json(),
        ]);

        if (cancelled) return;

        setProperties(Array.isArray(propsData) ? propsData : []);
        setTenants(Array.isArray(tenantsData) ? tenantsData : []);
        setLeases(Array.isArray(leasesData) ? leasesData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);

        // Load units for all properties in parallel rather than serial for-loop
        if (Array.isArray(propsData) && propsData.length > 0) {
          const unitResponses = await Promise.all(
            propsData.map((p) =>
              fetch(`/api/units?propertyId=${p.id}`).then((r) =>
                r.ok ? r.json() : []
              )
            )
          );
          if (!cancelled) {
            setUnits(unitResponses.flat());
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDataError(
            err instanceof Error ? err.message : "Failed to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Monthly Financial Data Load
  useEffect(() => {
    let cancelled = false;

    async function loadFinancials() {
      setFinancialLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/financials?month=${month}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load financial data.");
        }

        if (!cancelled) {
          setFinancials(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong loading financials."
          );
        }
      } finally {
        if (!cancelled) {
          setFinancialLoading(false);
        }
      }
    }

    loadFinancials();

    return () => {
      cancelled = true;
    };
  }, [month]);

  // Derived state calculations
  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
  const vacantUnits = units.filter((u) => u.status === "VACANT").length;
  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const totalTenants = tenants.length;
  const activeLeases = leases.filter((lease) => lease.status === "ACTIVE").length;
  const collectionRate =
    financials && financials.totalDue > 0
      ? Math.round((financials.paymentsReceived / financials.totalDue) * 100)
      : 0;

  const recentPayments = [...payments]
    .sort(
      (a, b) =>
        new Date(b.payment.paidOn).getTime() - new Date(a.payment.paidOn).getTime()
    )
    .slice(0, 5);

  const activeLeaseList = leases.filter((lease) => lease.status === "ACTIVE");

  const propertySummaries = properties.map((property) => {
    const propertyUnits = units.filter((u) => u.propertyId === property.id);
    return {
      ...property,
      totalUnits: propertyUnits.length,
      occupiedUnits: propertyUnits.filter((u) => u.status === "OCCUPIED").length,
      vacantUnits: propertyUnits.filter((u) => u.status === "VACANT").length,
    };
  });

  return (
    <div className="space-y-6">
      {dataError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {dataError}
        </p>
      )}

      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time portfolio metrics and leasing health.
          </p>
        </div>
      </header>

      {/* Top Portfolio Stats Grid */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Properties</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {initialLoading ? "..." : totalProperties}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Units</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {initialLoading ? "..." : totalUnits}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Occupied Units</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {initialLoading ? "..." : occupiedUnits}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Vacant Units</p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {initialLoading ? "..." : vacantUnits}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Occupancy</p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {initialLoading ? "..." : `${occupancyRate}%`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Leases</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {initialLoading ? "..." : activeLeases}
          </p>
        </div>
      </section>

      {/* Contextual Monthly Financial Section with Dedicated Month Picker */}
      <section
        ref={financialSectionRef}
        className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Monthly Financial Overview
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {formatSelectedMonth(month)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Rent collection, utility charges, and net cash flow for the selected period.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-month" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Select Month:
            </label>
            <input
              id="dashboard-month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>

        <div className="p-5">
          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {financialLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-3 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : financials ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rent Due</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(financials.rentDue)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Electricity Due</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(financials.electricityDue)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Due</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(financials.totalDue)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payments Received</p>
                <p className="mt-1.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(financials.paymentsReceived)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Collection Rate</p>
                <p className="mt-1.5 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {collectionRate}%
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Due</p>
                <p className="mt-1.5 text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(financials.outstanding)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Expenses</p>
                <p className="mt-1.5 text-xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(financials.expenses)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Income</p>
                <p className={`mt-1.5 text-xl font-bold ${
                  Number(financials.netIncome) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {formatCurrency(financials.netIncome)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Property Overview */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Property Overview
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {propertySummaries.length === 0 ? (
            <p className="p-5 text-sm text-slate-500 dark:text-slate-400">
              {initialLoading ? "Loading properties..." : "No properties added yet."}
            </p>
          ) : (
            propertySummaries.map((property) => (
              <div
                key={property.id}
                className="grid gap-4 p-5 sm:grid-cols-4"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {property.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {property.address}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Units</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {property.totalUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Occupied</p>
                  <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    {property.occupiedUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Vacant</p>
                  <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                    {property.vacantUnits}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Payments */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Payments
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {recentPayments.length === 0 ? (
            <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
              {initialLoading ? "Loading payments..." : "No payments recorded yet."}
            </div>
          ) : (
            recentPayments.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 p-5 sm:grid-cols-4"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {item.tenant?.name || "Unknown Tenant"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.property?.name || "Property"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Amount</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.payment?.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Target Month</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {item.payment?.month || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Paid On</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {formatDate(item.payment?.paidOn)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Active Lease Overview */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Active Leases
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {activeLeaseList.length === 0 ? (
            <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
              {initialLoading ? "Loading leases..." : "No active leases found."}
            </div>
          ) : (
            activeLeaseList.map((lease) => (
              <div
                key={lease.id}
                className="grid gap-4 p-5 sm:grid-cols-5"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tenant</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {lease.tenant?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Property</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {lease.property?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unit</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {lease.unit?.number || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Rent</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(lease.rent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lease Ends</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {lease.agreementEndsOn ? formatDate(lease.agreementEndsOn) : "Open-ended"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}