"use client";

import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Unit = {
  id: number;
  number: number;
  type: string;
  rent: number;
  status: string;
  propertyId: number;
};

export default function Unit({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const [isNavigating, startNavigationTransition] = useTransition();
  const [navigatingUnitId, setNavigatingUnitId] = useState<number | null>(null);

  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [rent, setRent] = useState("");
  const [status, setStatus] = useState("VACANT");
  const [loading, setLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [propertyNotFound, setPropertyNotFound] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setSelectedUnitId(null);
    setNumber("");
    setType("");
    setRent("");
    setStatus("VACANT");
  }, []);

  function handleSelectEdit(unit: Unit) {
    setSelectedUnitId(Number(unit.id));
    setNumber(String(unit.number));
    setType(unit.type);
    setRent(String(unit.rent));
    setStatus(unit.status);

    // Reliable scroll target: check element and fallback smoothly
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // Also scroll window in case the outer window is the scroll parent
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Delay focus until smooth scroll finishes
    setTimeout(() => {
      numberInputRef.current?.focus();
      numberInputRef.current?.select();
    }, 250);
  }

  function handleViewUnit(unitId: number) {
    setNavigatingUnitId(unitId);
    startNavigationTransition(() => {
      router.push(`/units/${unitId}`);
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUnits() {
      setUnitsLoading(true);
      setLoadError(null);

      try {
        const { propertyId: propertyIdParam } = await params;
        const id = Number(propertyIdParam);

        if (!Number.isInteger(id) || id <= 0) {
          throw new Error("Invalid property ID.");
        }

        const response = await fetch(`/api/units?propertyId=${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) setPropertyNotFound(true);
            throw new Error(
              "This property could not be found. The link may be outdated, or the property may no longer exist."
            );
          }

          if (response.status === 401) {
            throw new Error("Your session has expired. Please log in again.");
          }

          throw new Error(
            `Unable to load units (HTTP ${response.status}). Please try again.`
          );
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid units response.");
        }

        if (!cancelled) {
          setPropertyId(id);
          setUnits(data as Unit[]);
        }
      } catch (error) {
        console.error("LOAD UNITS ERROR:", error);

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading units."
          );
        }
      } finally {
        if (!cancelled) {
          setUnitsLoading(false);
        }
      }
    }

    loadUnits();

    return () => {
      cancelled = true;
    };
  }, [params]);

  function validateForm(): boolean {
    if (!number.trim()) {
      alert("Unit number is required.");
      return false;
    }

    if (!Number.isInteger(Number(number)) || Number(number) <= 0) {
      alert("Unit number must be a positive whole number.");
      return false;
    }

    if (!type.trim()) {
      alert("Unit type is required.");
      return false;
    }

    if (!rent.trim() || !Number.isFinite(Number(rent)) || Number(rent) <= 0) {
      alert("Rent must be greater than 0.");
      return false;
    }

    if (status !== "VACANT" && status !== "OCCUPIED") {
      alert("Please select a valid occupancy status.");
      return false;
    }

    return true;
  }

  async function createUnit() {
    if (loading || !validateForm()) return;

    if (propertyId === null) {
      alert("Property information is still loading. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number(number),
          type: type.trim(),
          rent: Number(rent),
          status,
          propertyId,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Unable to create unit."}`);
        return;
      }

      let unit: Unit;
      try {
        unit = JSON.parse(text) as Unit;
      } catch {
        alert("The server returned an invalid response after creating the unit.");
        return;
      }

      setUnits((current) => [...current, unit]);
      resetForm();
    } catch (error) {
      console.error("CREATE UNIT ERROR:", error);
      alert("Something went wrong while creating the unit.");
    } finally {
      setLoading(false);
    }
  }

  async function updateUnit() {
    if (loading) return;
    if (selectedUnitId === null) {
      alert("Please select a unit to update.");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/units", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnitId,
          number: Number(number),
          type: type.trim(),
          rent: Number(rent),
          status,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Unable to update unit."}`);
        return;
      }

      let updatedUnit: Unit;
      try {
        updatedUnit = JSON.parse(text) as Unit;
      } catch {
        alert("The server returned an invalid response after updating the unit.");
        return;
      }

      setUnits((current) =>
        current.map((u) =>
          Number(u.id) === Number(selectedUnitId)
            ? {
                ...u,
                number: updatedUnit.number,
                type: updatedUnit.type,
                rent: updatedUnit.rent,
                status: updatedUnit.status,
              }
            : u
        )
      );

      resetForm();
    } catch (error) {
      console.error("UPDATE UNIT ERROR:", error);
      alert("Something went wrong while updating the unit.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUnit(unitId: number) {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/units", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Unable to delete unit."}`);
        return;
      }

      setUnits((current) => current.filter((u) => Number(u.id) !== Number(unitId)));

      if (Number(selectedUnitId) === Number(unitId)) {
        resetForm();
      }
    } catch (error) {
      console.error("DELETE UNIT ERROR:", error);
      alert("Something went wrong while deleting the unit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:underline active:scale-[0.98] dark:text-blue-400"
        >
          ← Back to Properties
        </Link>

        <header>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Property Units
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage the units, rental amounts, and occupancy status for this property.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Property ID: {propertyId ?? "Loading..."}
          </p>
        </header>

        {/* Add / Edit Form */}
        <section
          ref={formRef}
          className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 dark:bg-gray-800 sm:p-6 ${
            selectedUnitId !== null
              ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedUnitId !== null ? "Edit Unit" : "Add a Unit"}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {selectedUnitId !== null
                  ? "Update the details for this unit."
                  : "Enter the unit number, type, rent, and occupancy status."}
              </p>
            </div>
            {selectedUnitId !== null && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Editing Unit #{number || selectedUnitId}
              </span>
            )}
          </div>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedUnitId !== null) {
                updateUnit();
              } else {
                createUnit();
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="unit-number"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Unit number *
                </label>
                <input
                  ref={numberInputRef}
                  id="unit-number"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 101"
                  value={number}
                  disabled={loading}
                  onChange={(event) => setNumber(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="unit-type"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Unit type *
                </label>
                <input
                  id="unit-type"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. 2 BHK, Shop, Office"
                  value={type}
                  disabled={loading}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="unit-rent"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Monthly rent (₹) *
                </label>
                <input
                  id="unit-rent"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Enter monthly rent"
                  value={rent}
                  disabled={loading}
                  onChange={(event) => setRent(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="unit-status"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Occupancy status
                </label>
                <select
                  id="unit-status"
                  value={status}
                  disabled={loading}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || propertyId === null}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : selectedUnitId !== null ? (
                  "Update Unit"
                ) : (
                  "Add Unit"
                )}
              </button>

              {selectedUnitId !== null && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 active:scale-[0.98] disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Existing Units Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Existing Units
            </h2>
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {units.length} {units.length === 1 ? "unit" : "units"}
            </span>
          </div>

          {unitsLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="h-5 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-2 h-4 w-1/3 rounded bg-gray-100 dark:bg-gray-700/60" />
                  <div className="mt-4 h-6 w-1/2 rounded bg-gray-100 dark:bg-gray-700/40" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900 dark:bg-red-950/30"
              role="alert"
            >
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                {propertyNotFound ? "Property not found" : "Unable to load units"}
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => router.push("/properties")}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Back to Properties
              </button>
            </div>
          ) : units.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
              <h3 className="font-medium text-gray-900 dark:text-white">
                No units yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add the first unit for this property using the form above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {units.map((unit) => {
                const isCurrentEdit = Number(selectedUnitId) === Number(unit.id);

                return (
                  <article
                    key={unit.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-800 ${
                      isCurrentEdit
                        ? "border-blue-500 ring-2 ring-blue-500 dark:border-blue-500"
                        : "border-gray-200 hover:shadow-md dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-gray-900 dark:text-white">
                          Unit {unit.number}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {unit.type}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          unit.status === "VACANT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {unit.status === "VACANT" ? "Vacant" : "Occupied"}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Monthly Rent
                      </p>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        ₹{Number(unit.rent).toLocaleString("en-IN")}
                        <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                          /month
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectEdit(unit)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 ${
                          isCurrentEdit
                            ? "bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-300 dark:bg-blue-950 dark:text-blue-300"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {isCurrentEdit ? "Editing..." : "Edit"}
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Are you sure you want to delete unit "${unit.number}"?`
                          );
                          if (confirmed) {
                            void deleteUnit(unit.id);
                          }
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        disabled={isNavigating && navigatingUnitId === unit.id}
                        onClick={() => handleViewUnit(unit.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-75"
                      >
                        {isNavigating && navigatingUnitId === unit.id ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Opening...</span>
                          </>
                        ) : (
                          "View Unit →"
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}