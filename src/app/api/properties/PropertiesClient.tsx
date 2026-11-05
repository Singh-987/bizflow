"use client";

import LeaseHighlight from "@/components/LeaseHighlight";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type Property = {
  id: number;
  name: string;
  address: string;
  userId: string;
  isArchived: boolean;
};

export default function PropertiesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId");

  const formRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [archivedProperties, setArchivedProperties] = useState<Property[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        setIsInitialLoading(true);
        const [activeResponse, archivedResponse] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/properties?archived=true"),
        ]);

        if (!activeResponse.ok || !archivedResponse.ok) {
          throw new Error("Failed to load properties.");
        }

        const activeData = await activeResponse.json();
        const archivedData = await archivedResponse.json();

        if (!cancelled) {
          setProperties(Array.isArray(activeData) ? activeData : []);
          setArchivedProperties(Array.isArray(archivedData) ? archivedData : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("LOAD PROPERTIES ERROR:", error);
          setFeedbackMessage("Failed to load properties from server.");
          setFeedbackType("error");
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setSelectedPropertyId(null);
    setName("");
    setAddress("");
  }

  function handleSelectEdit(property: Property) {
    setSelectedPropertyId(property.id);
    setName(property.name);
    setAddress(property.address);
    setFeedbackMessage("");

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => nameInputRef.current?.focus(), 150);
  }

  async function createProperty() {
    if (!name.trim() || !address.trim()) {
      setFeedbackMessage("Please enter both property name and address.");
      setFeedbackType("error");
      return;
    }

    setLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), address: address.trim() }),
      });

      const text = await response.text();

      if (!response.ok) {
        setFeedbackMessage(`Error ${response.status}: ${text || "Failed to create property"}`);
        setFeedbackType("error");
        return;
      }

      const property = JSON.parse(text);
      setProperties((current) => [...current, property]);
      setFeedbackMessage(`Property "${property.name}" added successfully.`);
      setFeedbackType("success");
      resetForm();
    } catch (error) {
      console.error("CREATE PROPERTY ERROR:", error);
      setFeedbackMessage("Something went wrong while creating the property.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  async function updateProperty() {
    if (selectedPropertyId === null) {
      setFeedbackMessage("Please select a property to update.");
      setFeedbackType("error");
      return;
    }
    if (!name.trim() || !address.trim()) {
      setFeedbackMessage("Please enter both property name and address.");
      setFeedbackType("error");
      return;
    }

    setLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          name: name.trim(),
          address: address.trim(),
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        setFeedbackMessage(`Error ${response.status}: ${text || "Failed to update property"}`);
        setFeedbackType("error");
        return;
      }

      const property = JSON.parse(text);
      setProperties((current) =>
        current.map((item) =>
          item.id === selectedPropertyId
            ? { ...item, name: property.name, address: property.address }
            : item
        )
      );
      setFeedbackMessage(`Property "${property.name}" updated successfully.`);
      setFeedbackType("success");
      resetForm();
    } catch (error) {
      console.error("UPDATE PROPERTY ERROR:", error);
      setFeedbackMessage("Something went wrong while updating the property.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProperty(propertyId: number, propertyName: string) {
    setLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/properties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      const text = await response.text();
      if (!response.ok) {
        let message = "The property could not be deleted.";
        try {
          const data = JSON.parse(text);
          message = data.error || message;
        } catch {
          // fallback
        }

        setFeedbackMessage(message);
        setFeedbackType("error");
        return;
      }

      setFeedbackMessage(`Property "${propertyName}" deleted successfully.`);
      setFeedbackType("success");
      setProperties((current) =>
        current.filter((property) => property.id !== propertyId)
      );
      if (selectedPropertyId === propertyId) {
        resetForm();
      }
    } catch (error) {
      console.error("DELETE PROPERTY ERROR:", error);
      setFeedbackMessage("Something went wrong while deleting the property. Please try again.");
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  async function togglePropertyArchive(
    property: Property,
    action: "archive" | "restore"
  ) {
    setLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update property status.");
      }

      if (action === "archive") {
        setProperties((current) =>
          current.filter((item) => item.id !== property.id)
        );
        setArchivedProperties((current) => [
          ...current,
          { ...property, isArchived: true },
        ]);
        if (selectedPropertyId === property.id) {
          resetForm();
        }
        setFeedbackMessage(`"${property.name}" has been moved to archives.`);
      } else {
        setArchivedProperties((current) =>
          current.filter((item) => item.id !== property.id)
        );
        setProperties((current) => [
          ...current,
          { ...property, isArchived: false },
        ]);
        setFeedbackMessage(`"${property.name}" has been restored to active properties.`);
      }

      setFeedbackType("success");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6">
      {propertyId && (
        <Suspense fallback={null}>
          <LeaseHighlight targetId={`property-${propertyId}`} />
        </Suspense>
      )}

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Properties
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your real estate assets, address locations, and units.
        </p>
      </header>

      {/* Add / Edit Form */}
      <section
        ref={formRef}
        className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 dark:bg-gray-800 sm:p-6 ${
          selectedPropertyId !== null
            ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedPropertyId !== null ? "Edit Property" : "Add a Property"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedPropertyId !== null
                ? "Update the property details below."
                : "Enter the name and full physical address of the property."}
            </p>
          </div>
          {selectedPropertyId !== null && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Editing Property #{selectedPropertyId}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="property-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Property Name *
            </label>
            <input
              ref={nameInputRef}
              id="property-name"
              type="text"
              placeholder="e.g. Sunrise Heights"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="property-address"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Property Address *
            </label>
            <input
              id="property-address"
              type="text"
              placeholder="e.g. 124 Park Avenue, Suite 3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={selectedPropertyId !== null ? updateProperty : createProperty}
            disabled={loading}
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
            ) : selectedPropertyId !== null ? (
              "Update Property"
            ) : (
              "Add Property"
            )}
          </button>

          {selectedPropertyId !== null && (
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 active:scale-[0.98] disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      {/* In-page Toast / Notification Banner */}
      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-4 py-3 text-sm transition-all ${
            feedbackType === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{feedbackMessage}</p>
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage("");
                setFeedbackType("");
              }}
              aria-label="Dismiss message"
              className="shrink-0 text-sm font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Active Properties */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Properties
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </span>
        </div>

        {isInitialLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-3 h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/60" />
                <div className="mt-4 h-8 w-1/4 rounded bg-gray-100 dark:bg-gray-700/40" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-white">No properties yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add your first property using the form above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {properties.map((property) => {
              const isCurrentEdit = selectedPropertyId === property.id;

              return (
                <article
                  id={`property-${property.id}`}
                  key={property.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-800 ${
                    isCurrentEdit
                      ? "border-blue-500 ring-2 ring-blue-500 dark:border-blue-500"
                      : "border-gray-200 hover:shadow-md dark:border-gray-700"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-gray-900 dark:text-white">
                        {property.name}
                      </h3>
                      <p className="mt-1 break-words text-sm leading-6 text-gray-600 dark:text-gray-400">
                        {property.address}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        Property ID: {property.id}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectEdit(property)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] ${
                          isCurrentEdit
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {isCurrentEdit ? "Editing..." : "Edit"}
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive "${property.name}"?\n\nIt will be removed from your active view but can be restored anytime.`
                            )
                          ) {
                            togglePropertyArchive(property, "archive");
                          }
                        }}
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 active:scale-[0.98] disabled:opacity-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        Archive
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${property.name}"?\n\nProperties with active units or leases cannot be deleted.`
                            )
                          ) {
                            deleteProperty(property.id, property.name);
                          }
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                    <Link
                      href={`/properties/${property.id}/units`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline active:scale-[0.98] dark:text-blue-400"
                    >
                      <span>Manage units</span>
                      <span>→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Archived Properties */}
      {archivedProperties.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Archived Properties
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {archivedProperties.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {archivedProperties.map((property) => (
              <article
                key={property.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-lg font-semibold text-gray-700 dark:text-gray-200">
                    {property.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-200/60 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    Archived
                  </span>
                </div>

                <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-400">
                  {property.address}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Property ID: {property.id}
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (window.confirm(`Restore "${property.name}" to your active properties?`)) {
                      togglePropertyArchive(property, "restore");
                    }
                  }}
                  className="mt-4 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Restore Property
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}