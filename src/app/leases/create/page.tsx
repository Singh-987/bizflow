"use client";

import AppShell from "@/components/layout/AppShell";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

useEffect(() => {
    let cancelled = false;

    async function loadData() {
        try {
            const [propertiesRes, tenantsRes] = await Promise.all([
                fetch("/api/properties"),
                fetch("/api/tenants"),
            ]);

            if (propertiesRes.status === 401 || tenantsRes.status === 401) {
                window.location.replace("/login");
                return;
            }

            if (!propertiesRes.ok || !tenantsRes.ok) {
                throw new Error(
                    `Failed to load data: properties HTTP ${propertiesRes.status}, tenants HTTP ${tenantsRes.status}`
                );
            }

            const [propertiesData, tenantsData] = await Promise.all([
                propertiesRes.json(),
                tenantsRes.json(),
            ]);

            if (!Array.isArray(propertiesData) || !Array.isArray(tenantsData)) {
                throw new Error("Invalid properties or tenants response.");
            }

            if (!cancelled) {
                setProperties(propertiesData);
                setTenants(tenantsData);
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
}, []);

    useEffect(() => {
        if (!preselectedUnitId || properties.length === 0) {
            return;
        }
        async function selectUnit() {
            const response = await fetch(`/api/units?unitId=${preselectedUnitId}`);
            if (!response.ok) {
                return;
            }
            const selectedUnit = await response.json();
            if (!selectedUnit?.id || !selectedUnit?.propertyId) {
                return;
            }
            const propertyExists = properties.some((property) => property.id === selectedUnit.propertyId);
            if (!propertyExists) {
                return;
            }
            setPropertyId(String(selectedUnit.propertyId));
            setUnitId(String(selectedUnit.id));
        }
        selectUnit();
    }, [preselectedUnitId, properties]);
    useEffect(() => {
        if (!preselectedTenantId || tenants.length === 0) {
            return;
        }

        const tenantExists = tenants.some(
            (tenant) =>
                tenant.id === Number(preselectedTenantId)
        );

        if (tenantExists) {
            setTenantId(preselectedTenantId);
        }
    }, [preselectedTenantId, tenants]);
useEffect(() => {
    if (!propertyId) {
        setUnits([]);
        setUnitId("");
        return;
    }

    let cancelled = false;

    async function loadUnits() {
        setUnits([]);
        setUnitId("");

        try {
            const response = await fetch(
                `/api/units?propertyId=${propertyId}`
            );

            if (response.status === 401) {
                window.location.replace("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load units (HTTP ${response.status})`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Invalid units response.");
            }

           if (!cancelled) {
    setUnits(data);

    if (
        preselectedUnitId &&
        data.some(
            (unit: Unit) =>
                unit.id === Number(preselectedUnitId)
        )
    ) {
        setUnitId(preselectedUnitId);
    }
}
        } catch (error) {
            if (!cancelled) {
                console.error("Create Lease unit loading failed:", error);
                setErrorMessage(
                    "Unable to load units for this property. Please try again."
                );
            }
        }
    }

    loadUnits();

    return () => {
        cancelled = true;
    };
}, [propertyId, preselectedUnitId]);



    useEffect(() => {
        if (!tenantId) {
            setTenantLeaseWarning("");
            return;
        }

        async function checkTenantLease() {
            try {
                const response = await fetch(
                    `/api/leases?tenantId=${tenantId}`
                );

                if (!response.ok) {
                    setTenantLeaseWarning("");
                    return;
                }

                const data = await response.json();

                if (data.activeLease) {
                    setTenantLeaseWarning(
                        `This tenant already has an active lease ` +
                        `on ${data.activeLease.propertyName}, ` +
                        `Unit ${data.activeLease.unitNumber}.`
                    );
                } else {
                    setTenantLeaseWarning("");
                }
            } catch {
                setTenantLeaseWarning("");
            }
        }

        checkTenantLease();
    }, [tenantId]);

    async function createLease() {
        if (leaseLoading) {
            return;
        }

        if (!propertyId || !unitId || !tenantId) {
            setErrorMessage(
                "Property, unit and tenant are required."
            );
            return;
        }

        if (!agreementStartsOn) {
            setErrorMessage(
                "Agreement start date is required."
            );
            return;
        }

        if (
            agreementEndsOn &&
            agreementEndsOn < agreementStartsOn
        ) {
            setErrorMessage(
                "Agreement end date should not be before " +
                "agreement start date."
            );
            return;
        }

        const deposit =
            securityDeposit.trim() === ""
                ? 0
                : Number(securityDeposit);

        if (!Number.isInteger(deposit) || deposit < 0) {
            setErrorMessage(
                "Security deposit must be 0 or a positive number."
            );
            return;
        }

        const selectedUnit = units.find(
            (unit) => unit.id === Number(unitId)
        );

        if (!selectedUnit) {
            setErrorMessage("Selected unit not found.");
            return;
        }


        setErrorMessage("");
        setSuccessMessage("");
        setLeaseLoading(true);

        try {
            const response = await fetch("/api/leases", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tenantId: Number(tenantId),
                    unitId: Number(unitId),
                    agreementStartsOn,
                    agreementEndsOn:
                        agreementEndsOn || null,
                    rent: selectedUnit.rent,
                    securityDeposit: deposit,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(
                    data.error ||
                    "Failed to create lease."
                );
                return;
            }
            setCreatedLeaseId(data.id);
            setSuccessMessage(
                "Lease created successfully."
            );

            setPropertyId("");
            setUnitId("");
            setTenantId("");
            setAgreementStartsOn("");
            setAgreementEndsOn("");
            setSecurityDeposit("");
            setUnits([]);
            setTenantLeaseWarning("");
        } catch {
            setErrorMessage(
                "Something went wrong. Please try again."
            );
        } finally {
            setLeaseLoading(false);
        }
    }

    return (
        <AppShell>
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="mb-4 text-sm text-blue-600
                        hover:underline"
                    >
                        ← Back
                    </button>

                    <h1 className="text-2xl font-bold
                    text-slate-900 dark:text-white">
                        Create Lease
                    </h1>

                    <p className="mt-2 text-slate-600
                    dark:text-slate-400">
                        Create a new rental agreement for a unit.
                    </p>
                </div>

                <div className="w-full max-w-2xl space-y-5 rounded-2xl
    border border-slate-200 bg-white p-4
    dark:border-slate-700 dark:bg-slate-900
    sm:p-6">

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            Property
                        </label>

                        <select
                            value={propertyId}
                            onChange={(e) => {
                                setPropertyId(e.target.value);
                                setErrorMessage("");
                                setSuccessMessage("");
                            }}
                            className="w-full rounded-md border
                            border-slate-300 bg-white px-3 py-2
                            dark:border-slate-600
                            dark:bg-slate-800"
                        >
                            <option value="">
                                Select Property
                            </option>

                            {properties.map((property) => (
                                <option
                                    key={property.id}
                                    value={property.id}
                                >
                                    {property.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            Unit
                        </label>

                        <select
                            value={unitId}
                            onChange={(e) => {
                                setUnitId(e.target.value);
                                setErrorMessage("");
                                setSuccessMessage("");
                            }}
                            disabled={!propertyId}
                            className="w-full rounded-md border
                            border-slate-300 bg-white px-3 py-2
                            disabled:opacity-50
                            dark:border-slate-600
                            dark:bg-slate-800"
                        >
                            <option value="">
                                {propertyId
                                    ? "Select Unit"
                                    : "Select Property First"}
                            </option>

                            {units.map((unit) => (
                                <option
                                    key={unit.id}
                                    value={unit.id}
                                >
                                    Unit {unit.number} · ₹{unit.rent}
                                    {unit.status === "OCCUPIED"
                                        ? " · Occupied"
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {unitId && (
                        <div className="rounded-lg bg-slate-100 p-3
                        dark:bg-slate-800">
                            <p className="text-xs text-slate-500
                            dark:text-slate-400">
                                Monthly Rent
                            </p>

                            <p className="mt-1 text-lg font-semibold
                            text-slate-900 dark:text-white">
                                ₹
                                {units.find(
                                    (unit) =>
                                        unit.id === Number(unitId)
                                )?.rent ?? 0}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            Tenant
                        </label>

                        <select
                            value={tenantId}
                            onChange={(e) => {
                                setTenantId(e.target.value);
                                setErrorMessage("");
                                setSuccessMessage("");
                            }}
                            className="w-full rounded-md border
                            border-slate-300 bg-white px-3 py-2
                            dark:border-slate-600
                            dark:bg-slate-800"
                        >
                            <option value="">
                                Select Tenant
                            </option>

                            {tenants.map((tenant) => (
                                <option
                                    key={tenant.id}
                                    value={tenant.id}
                                >
                                    {tenant.name} · {tenant.phone}
                                </option>
                            ))}
                        </select>
                    </div>

                    {tenantLeaseWarning && (
                        <div
                            role="alert"
                            className="rounded-lg border border-amber-300
            bg-amber-50 p-3 dark:border-amber-800
            dark:bg-amber-950/40"
                        >
                            <p className="text-sm font-medium text-amber-800
            dark:text-amber-300">
                                ⚠️ Existing lease detected
                            </p>

                            <p className="mt-1 text-sm text-amber-700
            dark:text-amber-400">
                                {tenantLeaseWarning}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            Start Date
                        </label>

                        <input
                            type="date"
                            value={agreementStartsOn}
                            onChange={(e) => {
                                setAgreementStartsOn(e.target.value);
                                setErrorMessage("");
                                setSuccessMessage("");
                            }}
                            className="w-full min-w-0 rounded-lg border
    border-slate-300 bg-white px-3 py-2.5
    text-slate-900 focus:outline-none focus:ring-2
    focus:ring-blue-500 dark:border-slate-600
    dark:bg-slate-800 dark:text-white
    [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            End Date
                        </label>

                        <input
                            type="date"
                            value={agreementEndsOn}
                            onChange={(e) => {
                                setAgreementEndsOn(e.target.value);
                                setErrorMessage("");
                                setSuccessMessage("");
                            }}
                            className="w-full min-w-0 rounded-lg border
    border-slate-300 bg-white px-3 py-2.5
    text-slate-900 focus:outline-none focus:ring-2
    focus:ring-blue-500 dark:border-slate-600
    dark:bg-slate-800 dark:text-white
    [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm
                        font-medium">
                            Security Deposit
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
                            className="w-full rounded-md border
                            border-slate-300 bg-white px-3 py-2
                            dark:border-slate-600
                            dark:bg-slate-800"
                        />
                    </div>

                    {errorMessage && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200
            bg-red-50 p-3 text-sm text-red-700
            dark:border-red-900 dark:bg-red-950/40
            dark:text-red-300"
                        >
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="space-y-2">
                            <p
                                role="status"
                                className="rounded-lg border border-green-200
        bg-green-50 p-3 text-sm text-green-700
        dark:border-green-900 dark:bg-green-950/40
        dark:text-green-300"
                            >
                                {successMessage}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(`/leases?leaseId=${createdLeaseId}`)}
                                className="rounded-md bg-blue-600 px-4 py-2
                text-sm font-medium text-white
                hover:bg-blue-700"
                            >
                                View Lease
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={createLease}
                        disabled={leaseLoading}
                        className="rounded-md bg-blue-600 px-5 py-2
                        text-sm font-medium text-white
                        hover:bg-blue-700
                        disabled:cursor-not-allowed
                        disabled:opacity-50"
                    >
                        {leaseLoading
                            ? "Creating..."
                            : "Create Lease"}
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
                <div className="p-6 text-slate-600 dark:text-slate-400">
                    Loading lease form...
                </div>
            }
        >
            <CreateLeaseContent/>
        </Suspense>
    );
}