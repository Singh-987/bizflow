"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EditPayment={
    id: number;
    amount: number;
    paidOn: string;
    month: string;
    method: string;
    paymentType?: string;
    note?: string | null;
    editNotes? : string | null;
};
type EditPaymentProps = {
    payment: EditPayment;
};

export default function EditPaymentModal({payment}:EditPaymentProps){
    const router = useRouter();
    const [isOpen, setIsOpen]= useState(false);
    const [isSubmitting, setIsSubmitting]= useState(false);
    const [error, setError]= useState<string | null>(null);
    const initialDate = payment.paidOn
        ? new Date(payment.paidOn).toISOString().split("T")[0]
        :"" ;
    const [formData, setFormData]= useState({
        amount: payment.amount,
        paidOn: initialDate,
        month: payment.month || "",
        method: payment.method || "Cash",
        paymentType: payment.paymentType || "RENT",
        note: payment.note || "",
        editNotes: payment.editNotes || "",
    });
    const handleSubmit = async (e: React.FormEvent)=>{
        e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);

    try{
        const res = await fetch("/api/payments",{
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: payment.id,
                amount: Number(formData.amount),
                paidOn: new Date(formData.paidOn).toISOString(),
                month: formData.month,
                method: formData.method,
                type: formData.paymentType,
                note: formData.note || null,
                editNotes: formData.editNotes || null,
            }),
        });
        if(!res.ok){
            const data = await res.json();
            throw new Error(data.error || "Failed to update payment.");
        }
        setIsOpen(false);
        router.refresh();
    }catch(err:any){
        setError(err.message);
    }finally{
        setIsSubmitting(false)
    }
};
return (
    <>
      {/* 1. Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border
          border-slate-200 px-3 py-1
          text-xs font-semibold
          text-slate-700 transition
          hover:bg-slate-100
          dark:border-slate-700
          dark:text-slate-300
          dark:hover:bg-slate-800"
      >
        Edit
      </button>

      {/* 2. Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50
            flex items-center
            justify-center
            bg-slate-900/60 p-4
            backdrop-blur-sm"
        >
          {/* Dialog Card */}
          <div
            className="w-full max-w-lg
              rounded-2xl border
              border-slate-200 bg-white
              p-6 shadow-xl
              dark:border-slate-800
              dark:bg-slate-900"
          >
            {/* Header */}
            <div
              className="flex items-center
                justify-between border-b
                border-slate-100 pb-4
                dark:border-slate-800"
            >
              <div>
                <h3
                  className="text-lg font-bold
                    text-slate-900
                    dark:text-white"
                >
                  Edit Payment Record
                </h3>
                <p
                  className="text-xs
                    text-slate-500
                    dark:text-slate-400"
                >
                  ID: #{payment.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="text-slate-400
                  hover:text-slate-600
                  dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                className="mt-4 rounded-lg
                  bg-rose-50 p-3 text-xs
                  text-rose-700
                  dark:bg-rose-950/50
                  dark:text-rose-400"
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="mt-4 space-y-4"
            >
              {/* Row 1: Amount & Date */}
              <div
                className="grid grid-cols-2
                  gap-4"
              >
                <div>
                  <label
                    className="block text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300"
                  >
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: Number(
                          e.target.value
                        ),
                      })
                    }
                    className="mt-1 w-full
                      rounded-lg border
                      border-slate-200
                      bg-white px-3 py-2
                      text-sm text-slate-900
                      focus:border-emerald-500
                      focus:outline-none
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-white"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300"
                  >
                    Paid On
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.paidOn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paidOn:
                          e.target.value,
                      })
                    }
                    className="mt-1 w-full
                      rounded-lg border
                      border-slate-200
                      bg-white px-3 py-2
                      text-sm text-slate-900
                      focus:border-emerald-500
                      focus:outline-none
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-white"
                  />
                </div>
              </div>

              {/* Row 2: Month, Type, Method */}
              <div
                className="grid grid-cols-3
                  gap-4"
              >
                <div>
                  <label
                    className="block text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300"
                  >
                    Month
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        month:
                          e.target.value,
                      })
                    }
                    className="mt-1 w-full
                      rounded-lg border
                      border-slate-200
                      bg-white px-3 py-2
                      text-sm text-slate-900
                      focus:border-emerald-500
                      focus:outline-none
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-white"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300"
                  >
                    Type
                  </label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentType:
                          e.target.value,
                      })
                    }
                    className="mt-1 w-full
                      rounded-lg border
                      border-slate-200
                      bg-white px-3 py-2
                      text-sm text-slate-900
                      focus:border-emerald-500
                      focus:outline-none
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-white"
                  >
                    <option value="RENT">
                      RENT
                    </option>
                    <option
                      value="ELECTRICITY"
                    >
                      ELECTRICITY
                    </option>
                    <option value="DEPOSIT">
                      DEPOSIT
                    </option>
                    <option value="OTHER">
                      OTHER
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs
                      font-medium
                      text-slate-700
                      dark:text-slate-300"
                  >
                    Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        method:
                          e.target.value,
                      })
                    }
                    className="mt-1 w-full
                      rounded-lg border
                      border-slate-200
                      bg-white px-3 py-2
                      text-sm text-slate-900
                      focus:border-emerald-500
                      focus:outline-none
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-white"
                  >
                    <option value="UPI">
                      UPI
                    </option>
                    <option value="Cash">
                      Cash
                    </option>
                    <option
                      value="Bank Transfer"
                    >
                      Bank Transfer
                    </option>
                    <option value="Cheque">
                      Cheque
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 3: Note */}
              <div>
                <label
                  className="block text-xs
                    font-medium
                    text-slate-700
                    dark:text-slate-300"
                >
                  Payment Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      note: e.target.value,
                    })
                  }
                  className="mt-1 w-full
                    rounded-lg border
                    border-slate-200
                    bg-white px-3 py-2
                    text-sm text-slate-900
                    focus:border-emerald-500
                    focus:outline-none
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-white"
                />
              </div>

              {/* Row 4: Audit Note */}
              <div>
                <label
                  className="block text-xs
                    font-medium
                    text-amber-700
                    dark:text-amber-400"
                >
                  Reason for Edit (Required)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Corrected amount"
                  value={formData.editNotes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      editNotes:
                        e.target.value,
                    })
                  }
                  className="mt-1 w-full
                    rounded-lg border
                    border-amber-300
                    bg-amber-50/30 px-3 py-2
                    text-sm text-slate-900
                    focus:border-amber-500
                    focus:outline-none
                    dark:border-amber-800
                    dark:bg-amber-950/20
                    dark:text-white"
                />
              </div>

              {/* Row 5: Action Buttons */}
              <div
                className="flex items-center
                  justify-end gap-3
                  border-t
                  border-slate-100 pt-4
                  dark:border-slate-800"
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  className="rounded-lg px-4
                    py-2 text-xs font-medium
                    text-slate-600
                    hover:bg-slate-100
                    dark:text-slate-400
                    dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg
                    bg-emerald-600 px-4 py-2
                    text-xs font-semibold
                    text-white shadow-sm
                    hover:bg-emerald-500
                    disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
