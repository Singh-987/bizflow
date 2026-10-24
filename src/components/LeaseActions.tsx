"use client";

import { useState } from "react";

export default function LeaseActions({
    leaseId,
    status,
}:{
    leaseId: number;
    status: string;
}){
    const [showExtend, setShowExtend]= useState(false);
    const [newEndDate, setNewEndDate]=useState("");
    const [loading, setLoading]= useState(false);
    async function endLease(){
        const confirmed = window.confirm(
            "Are you sure you want to end this lease?"
        );

        if(!confirmed){
            return;
        }
        setLoading(true);

        try{
            const response = await fetch("/api/leases",{
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    leaseId,
                    action: "END",
                }),
            });

            const text = await response.text();

            console.log("END LEASE STATUS:", response.status);
            console.log("END LEASE RESPONSE:", text);

            if(!response.ok){
                alert(`Error ${response.status}: ${text || "Empty response"}`);
                return;
            }

            alert("Lease ended successfully.");
            window.location.reload();
        }catch(error){
            console.error("END LEASE ERROR:", error);
            alert("Something went wrong while ending the lease.");
        }finally{
            setLoading(false);
        }
    }
    if(status=== "ENDED"){
        return null;
    }
    async function extendLease(){
       if(!newEndDate){
        alert("New end date is required");
        return;
       }
       setLoading(true);
        try{
        const response= await fetch("/api/leases",{
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                leaseId,
                action: "EXTEND",
                agreementEndsOn: newEndDate,
            })
        });
        const text= await response.text();
        console.log("EXTEND LEASE STATUS:", response.status);
        console.log("EXTEND LEASE RESPONSE:", text);
        if(!response.ok){
            alert( `Error ${response.status}: ${text || "Empty response"}`);
            return;
        }
        alert("Lease Extended successfully.")
        window.location.reload();
    }catch(error){
        console.log("EXTEND LEASE ERROR:",error);
        alert("Something went wrong while extending the lease");
    }finally{
        setLoading(false);
    }
    }
    return(
      <div className="flex flex-wrap items-center gap-2">
        {!showExtend &&(
            <button
            onClick={()=>setShowExtend(true)}
            disabled= {loading}
            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            >
                Extend Lease
            </button>
        )}
        {showExtend &&(
            <div className="flex flex-wrap items-center gap-2">
            <input
            type="date"
            value={newEndDate}
            onChange={(e)=>setNewEndDate(e.target.value)}
            disabled={loading}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
            <button
            onClick={extendLease}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Extending...": "Extend"}
            </button>

            <button
            onClick={()=>{
                setShowExtend(false);
                setNewEndDate("");
            }}
            disabled= {loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
                Cancel
            </button>
            </div>
        )}
        <button
        onClick={endLease}
        disabled={loading}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
            {loading? "Ending...": "End Lease"}
        </button>
      </div>
    )
}