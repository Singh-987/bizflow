import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

function getLocalDateString(date: Date) {
    return (
        `${date.getFullYear()}-` +
        `${String(date.getMonth() + 1).padStart(2, "0")}-` +
        `${String(date.getDate()).padStart(2, "0")}`
    );
}

function getRentDueDate(
    leaseStart: string,
    year: number,
    month: number
) {
    const startDay = Number(leaseStart.slice(8, 10));
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dueDay = Math.min(startDay, lastDay);

    return (
        `${year}-` +
        `${String(month + 1).padStart(2, "0")}-` +
        `${String(dueDay).padStart(2, "0")}`
    );
}

export async function GET(){
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }
    const properties = await db.orm.public.Property
        .where({
            userId: session.user.id,
        })
        .all();
    const propertyIds = new Set(
        properties.map((property)=>property.id),
    );
    const propertyMap = new Map(
        properties.map((property)=>[property.id,property]),
    );
    const units = await db.orm.public.Unit.all();
    const ownedUnits = units.filter((unit)=>propertyIds.has(unit.propertyId),
    );
    const unitIds = new Set(ownedUnits.map((unit)=>unit.id));
    const leases = await db.orm.public.Lease.all();
    const ownedLeases = leases.filter((lease)=>unitIds.has(lease.unitId));
    const leaseIds = new Set(ownedLeases.map((lease)=>lease.id));
    const allPayments = await db.orm.public.Payment.all();
    const allReadings = await db.orm.public.ElectricityReading.all();
    const allExpenses = await db.orm.public.Expense.all();
    const tenants = await db.orm.public.Tenant
        .where({
            userId: session.user.id,
        })
        .all();
        const tenantMap= new Map(tenants.map((tenant)=> [tenant.id, tenant]));
    const unitMap = new Map(ownedUnits.map((unit)=>[unit.id, unit]));
    const leaseMap = new Map(ownedLeases.map((lease)=>[lease.id, lease]));
    const activity: {
        id: string;
        type: string;
        title: string;
        description: string;
        createdAt: string;
        href: string;
        isRead: boolean;
    }[]=[];
    const savedActivities = await db.orm.public.ActivityLog
        .where({
            userId: session.user.id,
        })
        .all();
    for(const log of savedActivities){
        activity.push({
            id: `activity-log-${log.id}`,
            type: log.entityType,
            title: log.title,
            description: log.description,
            createdAt: new Date(log.createdAt).toISOString(),
            href: log.href ?? "/dashboard",
            isRead: false,
        });
    }

    for (const payment of allPayments){
        if(!leaseIds.has(payment.leaseId)){
            continue;
        }

        const lease = leaseMap.get(payment.leaseId);
        if(!lease) continue;

        const unit = unitMap.get(lease.unitId);
        if(!unit) continue;

        const property = propertyMap.get(unit.propertyId);
        const tenant = tenantMap.get(lease.tenantId);
        if(!property || !tenant) continue;

        activity.push({
            id: `payment-${payment.id}`,
            type: "PAYMENT",
            title: `${payment.type} payment recorded`,
            description: `${tenant.name} . ${property.name}.`+
                `Unit ${unit.number}. ₹${payment.amount}`,
            createdAt: new Date(payment.createdAt,).toISOString(),
            href: `/payments?highlight=payment-${payment.id}`,
            isRead: false,
        });
    }
    for(const reading of allReadings){
        if(!leaseIds.has(reading.leaseId)){
            continue;
        }
        const lease = leaseMap.get(reading.leaseId);
        if(!lease) continue;

        const unit = unitMap.get(lease.unitId);
        if(!unit){
            continue;
        }
        const property = propertyMap.get(unit.propertyId);
        if(!property) continue;

        activity.push({
            id: `electricity-${reading.id}`,
            type: "ELECTRICITY",
            title: "Electricity reading recorded",
            description:
                `${property.name}. Unit ${unit.number}.` +
                `${reading.unitsUsed} units .` +
                `₹${reading.electricityBill}`,
            createdAt: new Date(reading.createdAt,).toISOString(),
           href: `/units/${unit.id}?highlight=electricity-${reading.id}`,
           isRead: false,
        });
    }
    for(const expense of allExpenses){
        if(!propertyIds.has(expense.propertyId)){
            continue;
        }
        const property = propertyMap.get(expense.propertyId);
        if(!property) continue;
    }
    // Generate rent reminders
const today = getLocalDateString(new Date());
const now = new Date();
const upcomingLimit = new Date(now);
upcomingLimit.setDate(upcomingLimit.getDate() + 7);

const upcomingLimitString = getLocalDateString(upcomingLimit);

for (const lease of ownedLeases) {
    if (lease.status !== "ACTIVE") continue;

    const leaseStart = String(lease.agreementStartsOn).slice(0, 10);
    const leaseEnd = lease.agreementEndsOn
        ? String(lease.agreementEndsOn).slice(0, 10)
        : null;

    if (leaseStart > today) continue;
    if (leaseEnd && leaseEnd < today) continue;

    const startDate = new Date(`${leaseStart}T12:00:00`);
    const currentDate = new Date(`${today}T12:00:00`);

    let year = startDate.getFullYear();
    let month = startDate.getMonth();

    while (
        year < currentDate.getFullYear() ||
        (
            year === currentDate.getFullYear() &&
            month <= currentDate.getMonth()
        )
    ) {
        const monthKey =
            `${year}-${String(month + 1).padStart(2, "0")}`;

        const dueDate = getRentDueDate(
            leaseStart,
            year,
            month
        );

        if (
            (!leaseEnd || dueDate <= leaseEnd) &&
            dueDate <= upcomingLimitString
        ) {
            const paidAmount = allPayments
                .filter(
                    (payment) =>
                        payment.leaseId === lease.id &&
                        payment.type === "RENT" &&
                        payment.month === monthKey
                )
                .reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

            const balance = Math.max(
                0,
                Number(lease.rent) - paidAmount
            );

            if (balance > 0 && dueDate <= upcomingLimitString) {
                const isOverdue = dueDate < today;
                const unit = unitMap.get(lease.unitId);
                const tenant = tenantMap.get(lease.tenantId);
                const property = unit
                    ? propertyMap.get(unit.propertyId)
                    : null;

                if (unit && tenant && property) {
                    activity.push({
                        id: `rent-${lease.id}-${monthKey}`,
                        type: isOverdue
                            ? "OVERDUE"
                            : "UPCOMING",
                        title: isOverdue
                            ? "Rent payment overdue"
                            : "Rent payment upcoming",
                        description:
                            `${tenant.name} · ${property.name} · ` +
                            `Unit ${unit.number} · ` +
                            `₹${balance.toLocaleString("en-IN")} outstanding · ` +
                            `Due ${dueDate}`,
                        createdAt: new Date().toISOString(),
                        href: `/units/${unit.id}?highlight=rent-${lease.id}-${monthKey}`,
                        isRead: false,
                    });
                }
            }
        }

        month++;

        if (month > 11) {
            month = 0;
            year++;
        }
    }
}
// Generate lease reminders
for (const lease of ownedLeases) {
    const leaseStart = String(
        lease.agreementStartsOn
    ).slice(0, 10);

    const leaseEnd = lease.agreementEndsOn
        ? String(lease.agreementEndsOn).slice(0, 10)
        : null;

    const unit = unitMap.get(lease.unitId);
    const tenant = tenantMap.get(lease.tenantId);

    const property = unit
        ? propertyMap.get(unit.propertyId)
        : null;

    if (!unit || !tenant || !property) continue;

    // Upcoming lease start
    if (
        lease.status === "UPCOMING" &&
        leaseStart >= today &&
        leaseStart <= upcomingLimitString
    ) {
        activity.push({
            id: `lease-start-${lease.id}`,
            type: "UPCOMING",
            title: "Lease starting soon",
            description:
                `${tenant.name} · ${property.name} · ` +
                `Unit ${unit.number} · Starts ${leaseStart}`,
            createdAt: new Date().toISOString(),
           href: `/leases?leaseId=${lease.id}`,
            isRead: false,
        });
    }

    // Upcoming lease expiry
    if (
        lease.status === "ACTIVE" &&
        leaseEnd &&
        leaseEnd >= today &&
        leaseEnd <= upcomingLimitString
    ) {
        activity.push({
            id: `lease-expiry-${lease.id}`,
            type: "UPCOMING",
            title: "Lease expiring soon",
            description:
                `${tenant.name} · ${property.name} · ` +
                `Unit ${unit.number} · Ends ${leaseEnd}`,
            createdAt: new Date().toISOString(),
           href: `/leases?leaseId=${lease.id}`,
            isRead: false,
        });
    }
}

   const readRecords = await db.orm.public.NotificationRead
    .where({
        userId: session.user.id,
    })
    .all();

const readIds = new Set(
    readRecords.map((record) => record.activityId),
);

const activityWithReadStatus = activity.map((item) => ({
    ...item,
    isRead: readIds.has(item.id),
}));

activityWithReadStatus.sort((a, b) => {
    if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
    }

    return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
});

const unreadCount = activityWithReadStatus.filter(
    (item) => !item.isRead,
).length;

return Response.json({
    activity: activityWithReadStatus.slice(0, 20),
    unreadCount,
});
}