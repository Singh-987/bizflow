"use client";

import { useEffect, useState } from "react";

type Tenant = {
    id: number;
    name: string;
    phone: string;
};

type CreateLeaseFormProps = {
    unitId: number;
    unitRent: number;
    tenants: Tenant[];
};

export default function CreateLeaseForm({
    unitId,
    unitRent,
    tenants,
}: CreateLeaseFormProps){
    const [tenantId, setTenantId]= useState("");
    const [tenantLeaseWarning, setTenantLeaseWarning]= useState("");
    const [agreementStartsOn, setAgreementStartsOn]= useState("");
    const [agreementEndsOn, setAgreementEndsOn]= useState("");
    const [securityDeposit, setSecurityDeposit]= useState("");
    const [leaseStatus, setLeaseStatus]= useState("ACTIVE");
    const [leaseLoading, setLeaseLoading]= useState(false);
    const [errorMessage, setErrorMessage]= useState("");
    const [successMessage, setSuccessMessage]= useState("");

   useEffect(() => {
  async function checkTenantLease() {
    if (!tenantId) {
      setTenantLeaseWarning("");
      return;
    }

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

    async function createLease(){
        if(!tenantId){
            alert("Please select a tenant.");
            return;
        }

        if(!agreementStartsOn){
            alert("Agreement start date is required")
            return;
        }
        const today = new Date()
            .toISOString()
            .split("T")[0];
        const calculatedStatus =
            agreementStartsOn> today
            ? "UPCOMING"
            : "ACTIVE";
        if(agreementEndsOn && agreementEndsOn < agreementStartsOn){
            alert("Agreement end date should not be before agreement start date.");
            return;
        }
       const securityDepositValue =
            securityDeposit.trim() === ""
            ? 0
            : Number(securityDeposit);
        if(
            !Number.isInteger(securityDepositValue) ||
            securityDepositValue < 0
        ){
            setErrorMessage(
                "Security deposit must be 0 or a positive number."
            );
            return;
        }
        if(leaseLoading){
            return;
        }
          setErrorMessage("");
          setSuccessMessage("");
          setLeaseLoading(true);

        try{
            const response = await fetch("/api/leases",{
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    tenantId: Number(tenantId),
                    unitId,
                    agreementStartsOn,
                    agreementEndsOn: agreementEndsOn || null,
                    rent: unitRent,
                    securityDeposit: securityDepositValue,
                    status: calculatedStatus,
                }),
            });

           const data = await response.json();
            console.log("CREATE LEASE RESPONSE:", {
                status: response.status,
                data,
            });
           if(!response.ok){
            setErrorMessage(data.error || "Failed to create lease.");
            return;
           }
           setSuccessMessage("Lease created successfully.")
            setTenantId("");
            setAgreementStartsOn("");
            setAgreementEndsOn("");
            setSecurityDeposit("");
            setLeaseStatus("ACTIVE");
            setTenantLeaseWarning("");
        }catch{
            setErrorMessage("Something went wrong. Please try again.")
        }finally{
            setLeaseLoading(false);
        }
    }

    return(
       <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <h4 className="mb-3 text-sm font-semibold">
            Create Lease
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Tenant
                </label>
                <select
                    value={tenantId}
                    onChange={(e)=>setTenantId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                        <option value="">
                            Select Tenant
                        </option>
                        {tenants.map((tenant)=>(
                            <option
                                key={tenant.id}
                                value={tenant.id}
                            >
                                {tenant.name}
                            </option>
                        ))}
                    </select>
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Start Date
                </label>
                <input
                    type="date"
                    value={agreementStartsOn}
                    onChange={(e)=>setAgreementStartsOn(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
            </div>
             <div>
                <label className="mb-1 block text-sm font-medium">
                    End Date
                </label>
                <input
                    type="date"
                    value={agreementEndsOn}
                    onChange={(e)=>setAgreementEndsOn(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Security Deposit
                </label>
                <input
                    type="number"
                    min="0"
                    step="1"
                    value={securityDeposit}
                    onChange={(e)=>setSecurityDeposit(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
            </div>
        </div>
        {tenantLeaseWarning &&(
            <p className="mt-3 text-sm text-amber-600">
                {tenantLeaseWarning}
            </p>
        )}
        {errorMessage && (
            <p className="mt-3 text-sm text-red-600">
                {errorMessage}
            </p>
        )}
        {successMessage &&(
            <p className="mt-3 text-sm text-green-600">
                {successMessage}
            </p>
        )}
        <button
            type="button"
            onClick={createLease}
            disabled={leaseLoading}
            className="mt-4 rounded-md bg-blue-600
            px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {leaseLoading
                ? "Creating..."
                : "Create Lease"
                }
            </button>
       </div>
    )

}