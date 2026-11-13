"use client";

import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type Tenant = {
  id: number;
  name: string;
  phone: string;
  alternatePhone: string;
  email: string | null;
  govtId: string | null;
  govtIdFile: string | null;
};
function maskGovtId(value: string | null): string{
  if(!value || !value.trim()) return"Not provided";
  const clean = value.trim();
  if(clean.length<=4) return clean;
  const maskedLength = Math.min(clean.length -4, 8);
  return `${"•".repeat(maskedLength)} ${clean.slice(-4)}`;
}

export default function Tenants() {
  const router = useRouter();
  const formRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [govtId, setGovtId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [revealedIds, setRevealedIds]= useState<Set<number>>(new Set());
  const [showInputId, setShowInputId]= useState<boolean>(false);
  
  function toggleRevealId(tenantId: number): void{
    setRevealedIds((prev)=>{
      const next= new Set(prev);
      if(next.has(tenantId)){
        next.delete(tenantId);
      }else{
        next.add(tenantId);
      }
      return next;
    })
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTenants() {
      try {
        const response = await fetch("/api/tenants");

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load tenants (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid tenants response");
        }

        if (!cancelled) {
          setTenants(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load tenants:", error);
        }
      }
    }

    loadTenants();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function resetForm() {
    setSelectedTenantId(null);
    setName("");
    setPhone("");
    setAlternatePhone("");
    setEmail("");
    setGovtId("");
    setShowInputId(false);
  }

  function handleSelectEdit(tenant: Tenant) {
    setSelectedTenantId(tenant.id);
    setName(tenant.name);
    setPhone(tenant.phone);
    setAlternatePhone(tenant.alternatePhone || "");
    setEmail(tenant.email || "");
    setGovtId(tenant.govtId || "");
    setShowInputId(false);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => nameInputRef.current?.focus(), 150);
  }

  function validateInputs(): boolean {
    if (!name.trim()) {
      alert("Name is required");
      return false;
    }

    // Exactly 10 digits required for primary phone
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      alert("Primary Phone Number must be exactly 10 digits.");
      return false;
    }

    // If alternate phone is provided, it must also be exactly 10 digits
    if (alternatePhone.trim().length > 0) {
      const altDigits = alternatePhone.replace(/\D/g, "");
      if (altDigits.length !== 10) {
        alert("Alternate Phone Number must be exactly 10 digits.");
        return false;
      }
    }

    return true;
  }

  async function createTenant() {
    if (!validateInputs()) return;
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          alternatePhone,
          email,
          govtId,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Empty response"}`);
        return;
      }

      const tenant = JSON.parse(text);
      setTenants([...tenants, tenant]);
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function updateTenant() {
    if (selectedTenantId === null) {
      alert("Please select a tenant to update");
      return;
    }
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          name: String(name),
          phone: phone,
          alternatePhone: alternatePhone,
          email: String(email),
          govtId: String(govtId),
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Empty response"}`);
        return;
      }

      const updatedTenant = JSON.parse(text);
      setTenants((current) =>
        current.map((tenant) =>
          tenant.id === selectedTenantId
            ? {
                ...tenant,
                name: updatedTenant.name,
                phone: updatedTenant.phone,
                alternatePhone: updatedTenant.alternatePhone,
                email: updatedTenant.email,
                govtId: updatedTenant.govtId,
              }
            : tenant
        )
      );
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function deleteTenant(tenantId: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      const text = await response.text();

      if (!response.ok) {
        alert(`Error ${response.status}: ${text || "Empty response"}`);
        return;
      }

      setTenants((current) => current.filter((tenant) => tenant.id !== tenantId));
      if (selectedTenantId === tenantId) {
        resetForm();
      }
    } catch (error) {
      console.error("DELETE TENANT ERROR:", error);
      alert("Something went wrong while deleting Tenant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <Suspense fallback={null}>
          <LeaseHighlight targetId={null} />
        </Suspense>

        <header>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Tenants
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage tenant details and create leases.
          </p>
        </header>

        {/* Add / Edit Tenant Form */}
        <section
          ref={formRef}
          className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 dark:bg-gray-800 sm:p-6 ${
            selectedTenantId !== null
              ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedTenantId !== null ? "Edit Tenant" : "Add a Tenant"}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedTenantId !== null
                  ? "Update the tenant's information below."
                  : "Enter the tenant's contact and identification details."}
              </p>
            </div>
            {selectedTenantId !== null && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Editing Tenant #{selectedTenantId}
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tenant-name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name *
              </label>
              <input
                ref={nameInputRef}
                id="tenant-name"
                type="text"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-phone"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Phone Number * (10 Digits)
              </label>
              <input
                id="tenant-phone"
                type="tel"
                maxLength={10}
                placeholder="10-digit number (e.g. 9876543210)"
                value={phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(cleaned);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-alternate-phone"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Alternate Phone (10 Digits)
              </label>
              <input
                id="tenant-alternate-phone"
                type="tel"
                maxLength={10}
                placeholder="Optional 10-digit number"
                value={alternatePhone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setAlternatePhone(cleaned);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="tenant-email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <input
                id="tenant-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="tenant-govt-id"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Government ID
                </label>
                {govtId.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInputId((prev) => !prev)}
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {showInputId ? "Hide ID" : "Show ID"}
                  </button>
                )}
              </div>
              <input
                id="tenant-govt-id"
                type={showInputId ? "text" : "password"}
                placeholder="e.g. XXXX-XXXX-1234 (Aadhaar last 4 digits) or PAN"
                value={govtId}
                onChange={(e) => setGovtId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                For Aadhaar, enter only the last 4 digits (e.g., XXXX-XXXX-1234) to minimize KYC liability.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={selectedTenantId !== null ? updateTenant : createTenant}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : selectedTenantId !== null ? (
                "Update Tenant"
              ) : (
                "Add Tenant"
              )}
            </button>

            {selectedTenantId !== null && (
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

        {/* Existing Tenants */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Existing Tenants
            </h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
            </span>
          </div>

          {tenants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-white">
                No tenants yet
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your first tenant using the form above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {tenants.map((tenant) => {
                const isRevealed = revealedIds.has(tenant.id);
                const isCurrentEdit = selectedTenantId === tenant.id;
                return (
                  <article
                    id={`tenant-${tenant.id}`}
                    key={tenant.id}
                    className={`rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-800 sm:p-5 ${
                      isCurrentEdit
                        ? "border-blue-500 ring-2 ring-blue-500 dark:border-blue-500"
                        : "border-gray-200 hover:shadow-md dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-gray-900 dark:text-white">
                          {tenant.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Tenant ID: {tenant.id}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Tenant
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Phone
                        </p>
                        <p className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
                          {tenant.phone || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Alternate Phone
                        </p>
                        <p className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
                          {tenant.alternatePhone || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Email
                        </p>
                        <p className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
                          {tenant.email || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Government ID
                          </p>
                          {tenant.govtId && (
                            <button
                              type="button"
                              onClick={() => toggleRevealId(tenant.id)}
                              aria-label={isRevealed ? "Hide Government ID" : "Reveal Government ID"}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {isRevealed ? (
                                <>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                  </svg>
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>Show</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="mt-1 break-words font-mono text-sm text-gray-900 dark:text-gray-100">
                          {isRevealed ? tenant.govtId : maskGovtId(tenant.govtId)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleSelectEdit(tenant)}
                        disabled={loading}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 ${
                          isCurrentEdit
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {isCurrentEdit ? "Editing..." : "Edit"}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/leases/create?tenantId=${tenant.id}`)}
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
                      >
                        Create Lease
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Are you sure you want to delete tenant "${tenant.name}"?`
                          );
                          if (confirmed) {
                            deleteTenant(tenant.id);
                          }
                        }}
                        disabled={loading}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Delete
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