"use client";

import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import { Suspense, useEffect, useState } from "react";

type Tenant= {
    id: number;
    name: string;
    phone: string;
    alternatePhone: string;
    email: string | null;
    govtId: string | null;
    govtIdFile: string | null;
};

export default function Tenants(){
    const [tenants, setTenants]= useState<Tenant[]>([]);
    const [name, setName]= useState("");
    const [phone, setPhone]=useState("");
    const [email, setEmail]=useState("");
    const [alternatePhone, setAlternatePhone]=useState("");
    const [govtId, setGovtId]= useState("");
    const [loading, setLoading]=useState(false);
    const [selectedTenantId, setSelectedTenantId]= useState<number | null>(null);

    useEffect(() => {
    let cancelled = false;

    async function loadTenants() {
        try {
            const response = await fetch("/api/tenants");

            if (response.status === 401) {
                window.location.replace("/login");
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
}, []);

    async function createTenant(){
        if(!name.trim()){
            alert("Name is required");
            return;
        }
        if(!phone.trim()){
            alert("Phone is required");
            return;
        }
        if(loading){
            return;
        }
        setLoading(true);

        try{
            const response= await fetch("/api/tenants", {
                method: "POST",
                headers:{
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    phone,
                    alternatePhone,
                    email,
                    govtId,
                }),
            });

            const text = await response.text();

            console.log("TENANT STATUS:", response.status);
            console.log("TENANT RESPONSE:", text);

            if(!response.ok){
                alert(`Error ${response.status}: ${text || "Empty response"}`);
                return;
            }
            const tenant = JSON.parse(text);
            setTenants([...tenants, tenant]);
            setName("");
            setPhone("");
            setAlternatePhone("");
            setEmail("");
            setGovtId("");
        } finally{
            setLoading(false);
        }

    }

    async  function updateTenant(){
        if(selectedTenantId===null){
            alert("Please select a tenanat to update");
            return;
        }
        if(!name.trim()){
            alert("Tenant name is required.");
            return;
        }
        if(!phone.trim()){
            alert("Tenant phone number is required");
            return;
        }
        setLoading(true);
        try{
            const response = await fetch("/api/tenants",{
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tenantId: selectedTenantId,
                    name: String(name),
                    phone: phone,
                    alternatePhone: alternatePhone,
                    email: String(email),
                    govtId: String(govtId),
                })
            });
            const text = await response.text();
            console.log("UPDATE TENANT STATUS:", response.status);
            console.log("UPDATE TENANT RESPONSE:", text);
            if(!response.ok){
                alert(`Error ${response.status}: ${text || "Empty response"}`);
                return;
            }
            const updatedTenant = JSON.parse(text);
            setTenants((current)=>
            current.map((tenant)=>
            tenant.id === selectedTenantId
            ?{
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
            setSelectedTenantId(null);
            setName("");
            setPhone("");
            setAlternatePhone("");
            setEmail("");
            setGovtId("");
        }finally{
            setLoading(false);
        }
    }
    async function deleteTenant(tenantId: number){
        setLoading(true);
        try{
            const response = await fetch("/api/tenants", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tenantId,
                }),
            });
            const text = await response.text();
            console.log("STATUS:",response.status);
            console.log("RESPONSE:", text);
            if(!response.ok){
                alert(`Error ${response.status}: ${text || "Empty response"}`);
                return;
            }
            setTenants((current)=>
            current.filter((tenant)=> tenant.id !==tenantId)
            );
            setSelectedTenantId(null);
            setName("");
            setPhone("");
            setAlternatePhone("");
            setEmail("");
            setGovtId("");
        }catch(error){
            console.log("DELETE TENANT ERROR:", error)
            alert("Something went wrong while deleting Tenant.");
        }finally{
            setLoading(false);
        }
    }
        return (
        <AppShell>
            <main className="mx-auto w-full max-w-6xl space-y-6">
                <Suspense fallback={null}>
                    <LeaseHighlight targetId={null}/>
                </Suspense>
                <header>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        Tenants
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Manage tenant details and create leases.
                    </p>
                </header>

                {/* Add / Edit Tenant */}
                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedTenantId !== null
                                ? "Edit Tenant"
                                : "Add a Tenant"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedTenantId !== null
                                ? "Update the tenant's information below."
                                : "Enter the tenant's contact and identification details."}
                        </p>
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
                                id="tenant-name"
                                type="text"
                                placeholder="Enter full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="tenant-phone"
                                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Phone Number *
                            </label>
                            <input
                                id="tenant-phone"
                                type="tel"
                                placeholder="Enter phone number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="tenant-alternate-phone"
                                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Alternate Phone
                            </label>
                            <input
                                id="tenant-alternate-phone"
                                type="tel"
                                placeholder="Enter alternate phone"
                                value={alternatePhone}
                                onChange={(e) =>
                                    setAlternatePhone(e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="tenant-govt-id"
                                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Government ID
                            </label>
                            <input
                                id="tenant-govt-id"
                                type="text"
                                placeholder="Enter government ID number"
                                value={govtId}
                                onChange={(e) => setGovtId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={
                                selectedTenantId !== null
                                    ? updateTenant
                                    : createTenant
                            }
                            disabled={loading}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Saving..."
                                : selectedTenantId !== null
                                    ? "Update Tenant"
                                    : "Add Tenant"}
                        </button>

                        {selectedTenantId !== null && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTenantId(null);
                                    setName("");
                                    setPhone("");
                                    setAlternatePhone("");
                                    setEmail("");
                                    setGovtId("");
                                }}
                                disabled={loading}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
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
                            {tenants.length}{" "}
                            {tenants.length === 1 ? "tenant" : "tenants"}
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
                            {tenants.map((tenant) => (
                                <article
                                    id={`tenant-${tenant.id}`}
                                    key={tenant.id}
                                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-5"
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
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Government ID
                                            </p>
                                            <p className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
                                                {tenant.govtId || "Not provided"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedTenantId(tenant.id);
                                                setName(tenant.name);
                                                setPhone(tenant.phone);
                                                setAlternatePhone(
                                                    tenant.alternatePhone || ""
                                                );
                                                setEmail(tenant.email || "");
                                                setGovtId(tenant.govtId || "");
                                                window.scrollTo({
                                                    top: 0,
                                                    behavior: "smooth",
                                                });
                                            }}
                                            disabled={loading}
                                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                window.location.href = `/leases/create?tenantId=${tenant.id}`;
                                            }}
                                            disabled={loading}
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
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
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </AppShell>
    );
}
