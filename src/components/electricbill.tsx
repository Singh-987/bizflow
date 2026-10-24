"use client";

import { useEffect, useState } from "react";

export default function ElectricBill({
    leaseId,
    autoOpen = false,
}: {
    leaseId: string;
    autoOpen?: boolean;
}) {
    const [showBill, setShowBill]= useState(false);
        useEffect(()=>{
            if(autoOpen){
                setShowBill(true);
            }
        },[autoOpen])

    const [currentReading, setCurrentReading]= useState("");
    const [billMonth, setBillMonth]= useState("");
    const [perUnitCharge, setPerUnitCharge]= useState("");
    const [meterChanged, setMeterChanged]= useState(false);
    const [loading, setLoading]= useState(false);
    const [previousReading, setPreviousReading]= useState(0);
    const [latestPerUnitCharge, setLatestPerUnitCharge]= useState<number | null>(null);
    const [loadingDetails, setLoadingDetails]= useState(false);
    const current = Number(currentReading);
    const rate= Number(perUnitCharge);
    const unitsUsed= meterChanged
          ? current
          : current - previousReading;
    const billAmount = unitsUsed * rate;

    useEffect(()=>{
        async function loadElectricityDetails(){
            setLoadingDetails(true);
            try{
                const response = await fetch(`/api/electricbill?leaseId=${leaseId}&month=${billMonth}`);
                if(!response.ok){
                    throw new Error("Failed to load electricity details.");
                }
                const electricity = await response.json();
                const lease = electricity.find(
                    (item:any)=> String(item.lease.id)=== String(leaseId)
                );
                if(lease){
                    setPreviousReading(lease.previousReadingForMonth ?? 0);
                    setLatestPerUnitCharge(lease.latestPerUnitChargeForMonth ?? null);

                    if(lease.previousPerUnitChargeForMonth !== null){
                        setPerUnitCharge(String(lease.previousPerUnitChargeForMonth));
                    }
                }
            }catch(error){
                        console.log("LOAD ELECTRICITY ERROR:",error);
                        alert("Unable to load previous electricity details.");
                    }finally{
                        setLoadingDetails(false);
                    }
        }
        if(showBill&& billMonth){
            loadElectricityDetails();
        }
    },[showBill, leaseId, billMonth]);

    async function addElectricPayment(){
        if(!currentReading || !billMonth){
            alert("Please fill all the required fields");
            return;
        }
        setLoading(true);

        try{
            const response = await fetch("/api/electricbill",{
                method: "POST",
                headers:{
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    leaseId,
                    currentReading: Number(currentReading),
                    month: billMonth,
                    perUnitCharge: Number(perUnitCharge),
                    meterChanged,
                })
            });

            const text = await response.json();
            console.log("ADD BILL STATUS:", response.status);
            console.log("ADD BILL RESPONSE:", text);
            if(!response.ok){
                alert(`Error ${response.status}: ${text.error ?? "unknown error"}`);
                return;
            }
            window.dispatchEvent(new CustomEvent("electricity-bill-updated",{
                detail: {leaseId},
            }));
            alert("Bill added successfully.");
            setCurrentReading("");
            setBillMonth("");
            setPerUnitCharge("");
            setMeterChanged(false);
            setShowBill(false);
        }catch(error){
            console.log("ADD BILL ERROR:",error);
            alert("Something went wrong while adding bill.");
        }finally{
            setLoading(false);
        }
    }
    return(
        <div className="flex flex-wrap gap-2">
            <button
            onClick={()=>setShowBill(true)}
            disabled={loading}
            className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950">
                Add  Bill
            </button>
            {showBill &&(
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                       <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
    Previous Reading
</p>

<p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
    {loadingDetails ? "Loading..." : previousReading}
</p>
                       </div>
                       <div>
                          <p className="text-xs font-medium text-slate-500">
                            Current Reading
                          </p>
                          <input
                            type="number"
                            min="0"
                            placeholder="Current Reading"
                            value={currentReading}
                            onChange={(e)=>setCurrentReading(e.target.value)}
                            disabled={loading|| loadingDetails}
                            className="bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                       </div>
                       <div>
                          <p className="text-xs font-medium text-slate-500">
                                Bill Month
                          </p>
                          <input
                            type="month"
                            value={billMonth}
                            onChange={(e)=>setBillMonth(e.target.value)}
                            disabled= {loading}
                            className="bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                          />
                       </div>
                       <div>
                          <p className="text-xs font-medium text-slate-500">
                                Per Unit Charge
                          </p>
                          <input
                            type="number"
                            placeholder={
                                latestPerUnitCharge !== null
                                ? String(latestPerUnitCharge)
                                : "Enter Rate"
                            }
                            value={perUnitCharge}
                            onChange={(e)=>setPerUnitCharge(e.target.value)}
                            disabled= {loading || loadingDetails}
                            className="bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                       </div>
                    </div>
                   <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Units Used
    </p>

    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {currentReading !== "" && perUnitCharge !== ""
            ? unitsUsed
            : "—"}
    </p>
</div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Bill Amount
    </p>

    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
        {currentReading !== "" && perUnitCharge !== ""
            ? `₹${billAmount.toLocaleString("en-IN")}`
            : "—"}
    </p>
</div>
                    <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
    <input
        type="checkbox"
        checked={meterChanged}
        onChange={(e) => setMeterChanged(e.target.checked)}
        disabled={loading}
        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
    />
    Meter was replaced{billMonth ? ` for ${billMonth}` : ""}
</label>
                    <div className="mt-3 flex gap-2">
                        <button
                        onClick={addElectricPayment}
                        disabled={loading}
                     className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {loading ? "Saving...": "Save Bill"}
                        </button>
                        <button
                        onClick={()=>{
                            setShowBill(false);
                            setBillMonth("");
                            setCurrentReading("");
                            setMeterChanged(false);
                            setShowBill(false);
                            setPreviousReading(0);
                            setLatestPerUnitCharge(null);
                        }}
                        disabled= {loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}