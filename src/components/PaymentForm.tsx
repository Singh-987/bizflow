"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


export default function PaymentForm({
    leaseId,
    autoOpen = false,
    embedded= false,
}: {
    leaseId: string;
    autoOpen?: boolean;
    embedded: boolean;
}) {
    const [showPayment, setShowPayment] = useState(false);
        useEffect(()=>{
            if(autoOpen){
                setShowPayment(true);
            }
        },[autoOpen])

    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentMonth, setPaymentMonth] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [paymentType, setPaymentType]= useState("RENT")
    const [paymentNote, setPaymentNote] = useState("");
    const [loading, setLoading]= useState(false);
    const router = useRouter();

    async function addPayment(){
        if(!paymentAmount.trim() || !paymentDate || !paymentMonth || !paymentMethod){
            alert("Please fill all required payment fileds");
            return;
        }
        const amount = Number(paymentAmount);
        if(!Number.isFinite(amount) || amount <=0){
            alert("Payment amount must be greater than zero.");
            return;
        }
        setLoading(true);

        try{
            const response = await fetch("/api/payments",{
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    leaseId,
                    amount,
                    paidOn: paymentDate,
                    month: paymentMonth,
                    method: paymentMethod,
                    type: paymentType,
                    note: paymentNote || null,
                })
            });

            const text = await response.text();
            console.log("ADD PAYMENT STATUS:", response.status);
            console.log("ADD PAYMENT RESPONSE:", text);
            if(!response.ok){
                alert(`Error ${response.status}: ${text || "Empty response"}`);
                return;
            }
            alert("Payment added successfully.");
            setShowPayment(false);
            router.refresh();
            setPaymentAmount("");
            setPaymentDate("");
            setPaymentMethod("UPI");
            setPaymentType("RENT");
            setPaymentMonth("");
            setPaymentNote("");
            setShowPayment(false);
        }catch(error){
            console.error("ADD PAYMENT ERROR:", error);
            alert("Something went wrong while adding payment.")
        }finally{
            setLoading(false);
        }

    }
    return(
        <div className="flex flex-wrap gap-2">
            {!embedded && (
    <button
        type="button"
        onClick={() => setShowPayment(true)}
        disabled={loading}
        className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
    >
        Add Payment
    </button>
)}
            {showPayment &&(
                <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <input
                        type="number"
                        placeholder="Amount"
                        value={paymentAmount}
                        onChange={(e)=>setPaymentAmount(e.target.value)}
                        disabled={loading}
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                        />

                    <input
                    placeholder="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e)=>setPaymentDate(e.target.value)}
                    disabled={loading}
                    className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />

                    <input
                    type="month"
                    placeholder="Month rent"
                    value={paymentMonth}
                    onChange={(e)=>setPaymentMonth(e.target.value)}
                    disabled={loading}
                    className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <select
                        value={paymentType}
                        onChange={(e)=>setPaymentType(e.target.value)}
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500">
                            <option value="RENT">RENT</option>
                            <option value="ELECTRICITY">ELECTRICITY</option>
                        </select>
                    <select
                        value={paymentMethod}
                        onChange={(e)=>setPaymentMethod(e.target.value)}
                        disabled={loading}
                        className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    >
                        <option value="UPI">UPI</option>
                        <option value="CASH">CASH</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="CHEQUE">CHEQUE</option>
                        <option value="OTHER">OTHER</option>
                    </select>

                    <input
                    type="text"
                    placeholder="Note (optional)"
                    value={paymentNote}
                    onChange={(e)=>setPaymentNote(e.target.value)}
                    disabled={loading}
                    className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    />
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button
                        onClick={addPayment}
                        disabled={loading}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {loading? "Saving...": "Save Payment"}
                        </button>
                        <button
                        onClick={()=>{
                            setShowPayment(false);
                            setPaymentAmount("");
                            setPaymentDate("");
                            setPaymentMonth("");
                            setPaymentMethod("UPI");
                            setPaymentType("RENT");
                            setPaymentNote("");
                        }}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}