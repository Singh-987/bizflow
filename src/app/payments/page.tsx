import AppShell from "@/components/layout/AppShell";
import LeaseHighlight from "@/components/LeaseHighlight";
import PaymentsPageForm from "@/components/PaymentPageForm";
import { auth } from "@/lib/auth";
import { getPaymentsForUser } from "@/lib/data/payment";
import { formatDate } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function PaymentsPage({searchParams,}:{
    searchParams: Promise<{highlight?: string}>;
}) {
    const params = await searchParams;
    const highlightId = params.highlight ?? null;
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        redirect("/login");
    }

   
const payments = await getPaymentsForUser(session.user.id);



    return (
        <AppShell>
            <LeaseHighlight
                targetId={highlightId}
            />
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Payments
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Track rent and electricity payments across your properties.
                </p>
                <div className="mt-6">
    <PaymentsPageForm />
</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Total Received
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            ₹{payments.reduce(
                                (total: number, item: any) =>
                                    total + Number(item.payment.amount),
                                0
                            )}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Rent Payments
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {payments.filter((item: any) => item.payment.type === "RENT").length}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Electricity Payments
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {payments.filter((item: any) => item.payment.type === "ELECTRICITY").length}
                        </p>
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    {payments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                            <p className="font-semibold text-slate-900 dark:text-white">
                                No payments recorded
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Payments will appear here once a payment is recorded.
                            </p>
                        </div>
                    ) : (

                            payments.map((item: any) => (
                                <div
                                    id={`payment-${item.id}`}
                                    key={item.id}
                                    className="rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-500 dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {item.tenant.name}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {item.property.name} · Unit {item.unit.number}
                                            </p>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                ₹{item.payment.amount}
                                            </p>

                                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                {item.payment.type}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                                        <p>Month: {item.payment.month}</p>
                                        <p>Paid: {formatDate(item.payment.paidOn)}</p>
                                        <p>Method: {item.payment.method}</p>
                                    </div>

                                    {item.payment.note && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                            Note: {item.payment.note}
                                        </p>
                                    )}
                                </div>
                            ))
                    )}
</div>
            </div>
        </AppShell>
    )
}
