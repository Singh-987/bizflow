"use client";

import AppShell from "@/components/layout/AppShell";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";

type Property = {
  id: number;
  name: string;
  address: string;
};

type Unit = {
  id: number;
  number: number;
  type: string;
  rent: number;
  status: string;
};

type Tenant = {
  id: number;
  name: string;
  phone: string;
};

function CreateLeaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTenantId = searchParams.get("tenantId");
  const preselectedUnitId = searchParams.get("unitId");

  const [isNavigating, startNavigationTransition] = useTransition();

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");

  const [agreementStartsOn, setAgreementStartsOn] = useState("");
  const [agreementEndsOn, setAgreementEndsOn] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [tenantLeaseWarning, setTenantLeaseWarning] = useState("");
  const [createdLeaseId, setCreatedLeaseId] = useState<number | null>(null);

  // 1. Initial Load: Properties and Tenants
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [propertiesRes, tenantsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/tenants"),
        ]);

        if (propertiesRes.status === 401 || tenantsRes.status === 401) {
          router.replace("/login");
          return;
        }

        if (!propertiesRes.ok || !tenantsRes.ok) {
          throw new Error("Failed to load initial form data.");
        }

        const [propertiesData, tenantsData] = await Promise.all([
          propertiesRes.json(),
          tenantsRes.json(),
        ]);

        if (!cancelled) {
          setProperties(Array.isArray(propertiesData) ? propertiesData : []);
          setTenants(Array.isArray(tenantsData) ? tenantsData : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Create Lease data loading failed:", error);
          setErrorMessage(
            "Unable to load properties or tenants. Please refresh and try again."
          );
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2. Preselect Unit & Property from query params
  useEffect(() => {
    if (!preselectedUnitId || properties.length === 0) return;

    let cancelled = false;

    async function resolvePreselectedUnit() {
      try {
        const res = await fetch(`/api/units?unitId=${preselectedUnitId}`);
        if (!res.ok) return;

        const selectedUnit = await res.json();
        if (
          !cancelled &&
          selectedUnit?.propertyId &&
          properties.some((p) => p.id === selectedUnit.propertyId)
        ) {
          setPropertyId(String(selectedUnit.propertyId));
          setUnitId(String(selectedUnit.id));
        }
      } catch (err) {
        console.error("Failed to resolve preselected unit:", err);
      }
    }

    resolvePreselectedUnit();

    return () => {
      cancelled = true;
    };
  }, [preselectedUnitId, properties]);

  // 3. Preselect Tenant from query params
  useEffect(() => {
    if (!preselectedTenantId || tenants.length === 0) return;

    const tenantExists = tenants.some(
      (tenant) => tenant.id === Number(preselectedTenantId)
    );

    if (tenantExists) {
      setTenantId(preselectedTenantId);
    }
  }, [preselectedTenantId, tenants]);

  // 4. Load units when property changes
  useEffect(() => {
    if (!propertyId) {
      setUnits([]);
      setUnitId("");
      return;
    }

    let cancelled = false;

    async function loadUnits() {
      try {
        const response = await fetch(`/api/units?propertyId=${propertyId}`);

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load units for this property.");
        }

        const data = await response.json();

        if (!cancelled && Array.isArray(data)) {
          setUnits(data);

          // If a preselected unit belongs to this property, ensure it stays selected
          if (
            preselectedUnitId &&
            data.some((u: Unit) => u.id === Number(preselectedUnitId))
          ) {
            setUnitId(preselectedUnitId);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Create Lease unit loading failed:", error);
          setErrorMessage("Unable to load units for this property.");
        }
      }
    }

    loadUnits();

    return () => {
      cancelled = true;
    };
  }, [propertyId, preselectedUnitId, router]);

  // 5. Tenant active lease warning check
  useEffect(() => {
    if (!tenantId) {
      setTenantLeaseWarning("");
      return;
    }

    let cancelled = false;

    async function checkTenantLease() {
      try {
        const response = await fetch(`/api/leases?tenantId=${tenantId}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled) {
          if (data.activeLease) {
            setTenantLeaseWarning(
              `This tenant already has an active lease on ${data.activeLease.propertyName}, Unit ${data.activeLease.unitNumber}.`
            );
          } else {
            setTenantLeaseWarning("");
          }
        }
      } catch {
        if (!cancelled) setTenantLeaseWarning("");
      }
    }

    checkTenantLease();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function createLease() {
    if (leaseLoading) return;

    if (!propertyId || !unitId || !tenantId) {
      setErrorMessage("Property, unit, and tenant are required.");
      return;
    }

    if (!agreementStartsOn) {
      setErrorMessage("Agreement start date is required.");
      return;
    }

    if (agreementEndsOn && agreementEndsOn < agreementStartsOn) {
      setErrorMessage(
        "Agreement end date should not be earlier than the start date."
      );
      return;
    }

    const deposit =
      securityDeposit.trim() === "" ? 0 : Number(securityDeposit);

    if (!Number.isInteger(deposit) || deposit < 0) {
      setErrorMessage("Security deposit must be 0 or a positive whole number.");
      return;
    }

    const selectedUnit = units.find((u) => u.id === Number(unitId));

    if (!selectedUnit) {
      setErrorMessage("Selected unit could not be found.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setLeaseLoading(true);

    try {
      const response = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: Number(tenantId),
          unitId: Number(unitId),
          agreementStartsOn,
          agreementEndsOn: agreementEndsOn || null,
          rent: selectedUnit.rent,
          securityDeposit: deposit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to create lease.");
        return;
      }

      setCreatedLeaseId(data.id);
      setSuccessMessage("Lease created successfully.");

      // Clear input fields
      setPropertyId("");
      setUnitId("");
      setTenantId("");
      setAgreementStartsOn("");
      setAgreementEndsOn("");
      setSecurityDeposit("");
      setUnits([]);
      setTenantLeaseWarning("");
    } catch {
      setErrorMessage("Something went wrong while creating the lease. Please try again.");
    } finally {
      setLeaseLoading(false);
    }
  }

  function handleViewCreatedLease() {
    if (!createdLeaseId) return;
    startNavigationTransition(() => {
      router.push(`/leases?leaseId=${createdLeaseId}`);
    });
  }

  const selectedUnit = units.find((u) => u.id === Number(unitId));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:underline active:scale-[0.98] dark:text-blue-400"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Create Lease
          </h1>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Set up a rental agreement between a tenant and a property unit.
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          {/* Property Select */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Property *
            </label>
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select Property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Select */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Unit *
            </label>
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              disabled={!propertyId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                {propertyId ? "Select Unit" : "Select Property First"}
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.number} · ₹{Number(u.rent).toLocaleString("en-IN")}
                  {u.status === "OCCUPIED" ? " (Occupied)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Rent Preview */}
          {selectedUnit && (
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Assigned Monthly Rent
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                ₹{Number(selectedUnit.rent).toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {/* Tenant Select */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tenant *
            </label>
            <select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select Tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.phone ? `· ${t.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Active Lease Warning */}
          {tenantLeaseWarning && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <p className="font-semibold">⚠️ Existing lease detected</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                {tenantLeaseWarning}
              </p>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Agreement Start Date *
            </label>
            <input
              type="date"
              value={agreementStartsOn}
              onChange={(e) => {
                setAgreementStartsOn(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Agreement End Date (Optional)
            </label>
            <input
              type="date"
              value={agreementEndsOn}
              onChange={(e) => {
                setAgreementEndsOn(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Security Deposit */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Security Deposit (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={securityDeposit}
              onChange={(e) => {
                setSecurityDeposit(e.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {errorMessage}
            </div>
          )}

          {/* Success Banner + Instant Feedback View Lease Button */}
          {successMessage && (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p
                role="status"
                className="text-sm font-medium text-emerald-800 dark:text-emerald-300"
              >
                ✓ {successMessage}
              </p>
              <button
                type="button"
                onClick={handleViewCreatedLease}
                disabled={isNavigating}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-75"
              >
                {isNavigating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Opening Lease...</span>
                  </>
                ) : (
                  "View Lease →"
                )}
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={createLease}
            disabled={leaseLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {leaseLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Creating Lease...</span>
              </>
            ) : (
              "Create Lease"
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

export default function CreateLeasePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-slate-500 dark:text-slate-400">
          Loading lease form...
        </div>
      }
    >
      <CreateLeaseContent />
    </Suspense>
  );
}