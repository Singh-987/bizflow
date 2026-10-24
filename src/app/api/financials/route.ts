import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month");

    if (!requestedMonth) {
        return Response.json(
            { error: "Month is required" },
            { status: 400 }
        );
    }

    // Validate the requested month before using it in calculations.
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
        return Response.json(
            { error: "Invalid month format. Use YYYY-MM." },
            { status: 400 }
        );
    }

    const properties = await db.orm.public.Property
        .where({
            userId: session.user.id,
        })
        .all();

    const propertyIds = new Set(
        properties.map((property) => property.id)
    );

    const allUnits = await db.orm.public.Unit.all();

    const units = allUnits.filter((unit) =>
        propertyIds.has(unit.propertyId)
    );

    const unitIds = new Set(
        units.map((unit) => unit.id)
    );

    const allLeases = await db.orm.public.Lease.all();

    const leases = allLeases.filter((lease) =>
        unitIds.has(lease.unitId)
    );

    const tenantIds = new Set(
        leases.map((lease) => lease.tenantId)
    );

    const allTenants = await db.orm.public.Tenant
        .where({
            userId: session.user.id,
        })
        .all();

    const tenants = allTenants.filter((tenant) =>
        tenantIds.has(tenant.id)
    );

    const allPayments = await db.orm.public.Payment.all();

    const allElectricityReadings =
        await db.orm.public.ElectricityReading.all();

    const tenantMap = new Map(
        tenants.map((tenant) => [
            tenant.id,
            tenant,
        ])
    );

    const monthStart = `${requestedMonth}-01`;

    const [year, month] = requestedMonth
        .split("-")
        .map(Number);

    const nextMonthStart = new Date(
        Date.UTC(year, month, 1)
    )
        .toISOString()
        .slice(0, 10);

    let rentDue = 0;
    let electricityDue = 0;
    let paymentsReceived = 0;
    let expenses = 0;

    const unitDetails: {
        leaseId: number;
        propertyId: number;
        propertyName: string;
        unitId: number;
        unitNumber: number;
        tenantId: number | null;
        tenantName: string;
        rent: number;
        rentPaid: number;
        advanceReceived: number;
        rentPending: number;
        electricityDue: number;
        electricityPaid: number;
        electricityPending: number;
        totalDue: number;
        totalPaid: number;
        totalPending: number;
        status: string;
    }[] = [];

    const paymentDetails: {
        id: number;
        amount: number;
        paidOn: unknown;
        month: string;
        method: string;
        type: string;
        note: string | null;
        propertyName: string;
        unitNumber: number;
        tenantName: string;
    }[] = [];

    /*
     * Calculate expenses for the selected month.
     */
    const propertyExpenses = await Promise.all(
        properties.map(async (property) => {
            return db.orm.public.Expense
                .where({
                    propertyId: property.id,
                })
                .all();
        })
    );

    for (const expensesForProperty of propertyExpenses) {
        for (const expense of expensesForProperty) {
            if (
                expense.date.slice(0, 7) ===
                requestedMonth
            ) {
                expenses += Number(expense.amount);
            }
        }
    }

    /*
     * Group payments by lease so that payments remain
     * associated with the correct tenant and unit.
     */
    const paymentsByLease = new Map<number, any[]>();

    for (const payment of allPayments) {
        const existing =
            paymentsByLease.get(payment.leaseId) ?? [];

        existing.push(payment);

        paymentsByLease.set(
            payment.leaseId,
            existing
        );
    }

    /*
     * Monthly payments received:
     *
     * Include every payment recorded for the selected
     * month that belongs to a lease in the user's
     * properties, including payments for ended or
     * future leases.
     *
     * Advances are included because this represents
     * cash received, not only payments applied to dues.
     */
    const userLeaseIds = new Set(
        leases.map((lease) => lease.id)
    );

    for (const payment of allPayments) {
        if (
            !userLeaseIds.has(payment.leaseId) ||
            payment.month !== requestedMonth
        ) {
            continue;
        }

        paymentsReceived += Number(payment.amount);
    }

    /*
     * Group electricity readings by lease.
     */
    const electricityByLease = new Map<
        number,
        any[]
    >();

    for (const reading of allElectricityReadings) {
        const existing =
            electricityByLease.get(reading.leaseId) ?? [];

        existing.push(reading);

        electricityByLease.set(
            reading.leaseId,
            existing
        );
    }

    /*
     * Calculate financial details for each unit.
     */
    for (const property of properties) {
        const propertyUnits = units.filter(
            (unit) =>
                unit.propertyId === property.id
        );

        for (const unit of propertyUnits) {
            const unitLeases = leases.filter(
                (lease) =>
                    lease.unitId === unit.id
            );

            /*
             * Payment history:
             *
             * Include payments from every lease for the
             * selected month, not just leases contributing
             * to the current month's dues.
             *
             * The tenant name comes from the lease
             * associated with each payment.
             */
            for (const currentLease of unitLeases) {
                const leasePayments =
                    paymentsByLease.get(
                        currentLease.id
                    ) ?? [];

                const paymentTenant =
                    tenantMap.get(
                        currentLease.tenantId
                    );

                for (const payment of leasePayments) {
                    if (
                        payment.month !==
                        requestedMonth
                    ) {
                        continue;
                    }

                    paymentDetails.push({
                        id: payment.id,
                        amount: Number(payment.amount),
                        paidOn: payment.paidOn,
                        month: payment.month,
                        method: payment.method,
                        type: payment.type,
                        note: payment.note,
                        propertyName: property.name,
                        unitNumber: unit.number,
                        tenantName:
                            paymentTenant?.name ??
                            "Unknown tenant",
                    });
                }
            }

            /*
             * Find every valid lease that overlaps
             * the selected month.
             *
             * A lease ending on the first day of the
             * month does not overlap that month.
             *
             * A lease starting on the first day of the
             * next month does not overlap this month.
             *
             * Invalid date ranges are excluded.
             */
            const applicableLeases =
                unitLeases.filter((lease) => {
                    const leaseStartDate =
                        lease.agreementStartsOn
                            .slice(0, 10);

                    const leaseEndDate =
                        lease.agreementEndsOn
                            ? lease.agreementEndsOn
                                .slice(0, 10)
                            : null;

                    // Reject invalid lease date ranges.
                    if (
                        leaseEndDate &&
                        leaseEndDate <= leaseStartDate
                    ) {
                        return false;
                    }

                    // The lease must start before next month.
                    if (
                        leaseStartDate >=
                        nextMonthStart
                    ) {
                        return false;
                    }

                    // The lease must end after this month begins.
                    if (
                        leaseEndDate &&
                        leaseEndDate <= monthStart
                    ) {
                        return false;
                    }

                    return true;
                });

            /*
             * IMPORTANT:
             *
             * Process every applicable lease instead of
             * selecting only the latest lease for a unit.
             *
             * Each applicable lease contributes its own
             * rent obligation and electricity balance.
             */
            for (const lease of applicableLeases) {
                const tenant =
                    tenantMap.get(lease.tenantId);

                const payments =
                    paymentsByLease.get(lease.id) ?? [];

                const unitRent = Number(lease.rent);

                // Full monthly rent for this applicable lease.
                rentDue += unitRent;

                let unitRentPaid = 0;
                let unitElectricityPaid = 0;
                let unitAdvanceReceived = 0;

                /*
                 * Calculate payments for this lease only.
                 */
                for (const payment of payments) {
                    if (
                        payment.month !==
                        requestedMonth
                    ) {
                        continue;
                    }

                    const amount =
                        Number(payment.amount);

                    if (payment.type === "RENT") {
                        const isAdvance =
                            (payment.note ?? "")
                                .toLowerCase()
                                .includes("advance");

                        if (isAdvance) {
                            /*
                             * Track advances separately.
                             * They count as cash received,
                             * but do not automatically reduce
                             * rent outstanding.
                             */
                            unitAdvanceReceived += amount;
                        } else {
                            unitRentPaid += amount;
                        }
                    }

                    if (
                        payment.type === "ELECTRICITY"
                    ) {
                        unitElectricityPaid += amount;
                    }
                }

                /*
                 * Electricity due belongs to this lease
                 * and the selected month.
                 */
                const monthElectricityBill = (
                    electricityByLease.get(lease.id) ?? []
                ).find(
                    (bill) =>
                        bill.month === requestedMonth
                );

                const unitElectricityDue =
                    monthElectricityBill
                        ? Math.max(
                            Number(
                                monthElectricityBill.electricityBill
                            ),
                            0
                        )
                        : 0;

                electricityDue += unitElectricityDue;

                /*
                 * Calculate outstanding balances independently
                 * for this lease.
                 */
                const unitRentPending = Math.max(
                    unitRent - unitRentPaid,
                    0
                );

                const unitElectricityPending = Math.max(
                    unitElectricityDue -
                    unitElectricityPaid,
                    0
                );

                const unitTotalDue =
                    unitRent + unitElectricityDue;

                const unitTotalPaid =
                    unitRentPaid + unitElectricityPaid;

                const unitTotalPending =
                    unitRentPending +
                    unitElectricityPending;

                /*
                 * Keep a separate row for each lease.
                 * leaseId also provides a unique React key.
                 */
                unitDetails.push({
                    leaseId: lease.id,
                    propertyId: property.id,
                    propertyName: property.name,
                    unitId: unit.id,
                    unitNumber: unit.number,
                    tenantId:
                        tenant?.id ?? null,
                    tenantName:
                        tenant?.name ??
                        "Unknown tenant",
                    rent: unitRent,
                    rentPaid: unitRentPaid,
                    advanceReceived:
                        unitAdvanceReceived,
                    rentPending:
                        unitRentPending,
                    electricityDue:
                        unitElectricityDue,
                    electricityPaid:
                        unitElectricityPaid,
                    electricityPending:
                        unitElectricityPending,
                    totalDue:
                        unitTotalDue,
                    totalPaid:
                        unitTotalPaid,
                    totalPending:
                        unitTotalPending,
                    status:
                        unitTotalPending === 0
                            ? "PAID"
                            : unitRentPaid > 0 ||
                              unitElectricityPaid > 0
                                ? "PARTIAL"
                                : "DUE",
                });
            }
        }
    }

    /*
     * Total dues include every applicable lease's rent
     * and electricity obligation.
     */
    const totalDue =
        rentDue + electricityDue;

    /*
     * Outstanding is calculated from the remaining
     * balances of individual leases.
     *
     * Payments from one lease cannot reduce another
     * lease's outstanding balance.
     */
    const outstanding = unitDetails.reduce(
        (total, unit) =>
            total + unit.totalPending,
        0
    );

    /*
     * Net cash flow:
     *
     * All payments received during the month,
     * including advances, minus expenses recorded
     * during the month.
     */
    const netIncome =
        paymentsReceived - expenses;

    return Response.json({
        month: requestedMonth,
        rentDue,
        electricityDue,
        totalDue,
        paymentsReceived,
        outstanding,
        expenses,
        netIncome,
        unitDetails,
        paymentDetails,
    });
}