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

export async function GET() {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  const mark = (name: string, start: number) => {
    timings[name] = Math.round(performance.now() - start);
  };

  let stepStartedAt = performance.now();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  mark("session", stepStartedAt);

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // --------------------------------------------------------------------------
  // STEP 1: Fetch all user-scoped data + properties concurrently (1 Round Trip)
  // --------------------------------------------------------------------------
  stepStartedAt = performance.now();
  const [properties, tenants, savedActivities, readRecords] =
    await Promise.all([
      db.orm.public.Property.where({ userId }).all(),
      db.orm.public.Tenant.where({ userId }).all(),
      db.orm.public.ActivityLog.where({ userId }).all(),
      db.orm.public.NotificationRead.where({ userId }).all(),
    ]);
  mark("initialData", stepStartedAt);

  if (!properties.length) {
    timings.total = Math.round(performance.now() - startedAt);
    return Response.json({ activity: [], unreadCount: 0 });
  }

  const propertyIds = properties.map((p) => p.id);
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  // --------------------------------------------------------------------------
  // STEP 2: Fetch Units for Properties (1 Round Trip)
  // --------------------------------------------------------------------------
  stepStartedAt = performance.now();
  const ownedUnits = await db.orm.public.Unit.where((unit) =>
    unit.propertyId.in(propertyIds)
  ).all();
  mark("units", stepStartedAt);

  if (!ownedUnits.length) {
    timings.total = Math.round(performance.now() - startedAt);
    return Response.json({ activity: [], unreadCount: 0 });
  }

  const unitIds = ownedUnits.map((u) => u.id);
  const unitMap = new Map(ownedUnits.map((u) => [u.id, u]));

  // --------------------------------------------------------------------------
  // STEP 3: Fetch Leases for Units (1 Round Trip)
  // --------------------------------------------------------------------------
  stepStartedAt = performance.now();
  const ownedLeases = await db.orm.public.Lease.where((lease) =>
    lease.unitId.in(unitIds)
  ).all();
  mark("leases", stepStartedAt);

  const leaseIds = ownedLeases.map((l) => l.id);
  const leaseMap = new Map(ownedLeases.map((l) => [l.id, l]));

  // --------------------------------------------------------------------------
  // STEP 4: Fetch Payments and Readings in parallel (1 Round Trip)
  // --------------------------------------------------------------------------
  stepStartedAt = performance.now();
  const [allPayments, allReadings] = await Promise.all([
    leaseIds.length
      ? db.orm.public.Payment.where((payment) =>
          payment.leaseId.in(leaseIds)
        ).all()
      : Promise.resolve([]),
    leaseIds.length
      ? db.orm.public.ElectricityReading.where((reading: any) =>
          reading.leaseId.in(leaseIds)
        ).all()
      : Promise.resolve([]),
  ]);
  mark("parallelQueries", stepStartedAt);

  // --------------------------------------------------------------------------
  // IN-MEMORY ACTIVITY MAPPING (Zero DB time)
  // --------------------------------------------------------------------------
  const activity: {
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
    href: string;
    isRead: boolean;
  }[] = [];

  // 1. Saved activity logs
  for (const log of savedActivities) {
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

  // 2. Payments activity
  for (const payment of allPayments) {
    const lease = leaseMap.get(payment.leaseId);
    if (!lease) continue;

    const unit = unitMap.get(lease.unitId);
    if (!unit) continue;

    const property = propertyMap.get(unit.propertyId);
    const tenant = tenantMap.get(lease.tenantId);
    if (!property || !tenant) continue;

    activity.push({
      id: `payment-${payment.id}`,
      type: "PAYMENT",
      title: `${payment.type} payment recorded`,
      description:
        `${tenant.name} · ${property.name} · ` +
        `Unit ${unit.number} · ₹${payment.amount}`,
      createdAt: new Date(payment.createdAt).toISOString(),
      href: `/payments?highlight=payment-${payment.id}`,
      isRead: false,
    });
  }

  // 3. Electricity readings
  for (const reading of allReadings) {
    const lease = leaseMap.get(reading.leaseId);
    if (!lease) continue;

    const unit = unitMap.get(lease.unitId);
    if (!unit) continue;

    const property = propertyMap.get(unit.propertyId);
    if (!property) continue;

    activity.push({
      id: `electricity-${reading.id}`,
      type: "ELECTRICITY",
      title: "Electricity reading recorded",
      description:
        `${property.name} · Unit ${unit.number} · ` +
        `${reading.unitsUsed} units · ` +
        `₹${reading.electricityBill}`,
      createdAt: new Date(reading.createdAt).toISOString(),
      href: `/units/${unit.id}?highlight=electricity-${reading.id}`,
      isRead: false,
    });
  }

  // 4. Rent Reminders
  const rentPaidByLeaseMonth = new Map<string, number>();
  for (const payment of allPayments) {
    if (payment.type !== "RENT") continue;
    const key = `${payment.leaseId}-${payment.month}`;
    rentPaidByLeaseMonth.set(
      key,
      (rentPaidByLeaseMonth.get(key) ?? 0) + Number(payment.amount)
    );
  }

  const today = getLocalDateString(new Date());
  const now = new Date();
  const upcomingLimit = new Date(now);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);
  const upcomingLimitString = getLocalDateString(upcomingLimit);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoString = getLocalDateString(sixMonthsAgo);

  for (const lease of ownedLeases) {
    if (lease.status !== "ACTIVE") continue;

    const leaseStart = String(lease.agreementStartsOn).slice(0, 10);
    const leaseEnd = lease.agreementEndsOn
      ? String(lease.agreementEndsOn).slice(0, 10)
      : null;

    if (leaseStart > today) continue;
    if (leaseEnd && leaseEnd < today) continue;

    const effectiveStart =
      leaseStart > sixMonthsAgoString ? leaseStart : sixMonthsAgoString;

    const startDate = new Date(`${effectiveStart}T12:00:00`);
    const currentDate = new Date(`${today}T12:00:00`);

    let year = startDate.getFullYear();
    let month = startDate.getMonth();

    while (
      year < currentDate.getFullYear() ||
      (year === currentDate.getFullYear() && month <= currentDate.getMonth())
    ) {
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const dueDate = getRentDueDate(leaseStart, year, month);

      if (
        (!leaseEnd || dueDate <= leaseEnd) &&
        dueDate <= upcomingLimitString
      ) {
        const paidAmount =
          rentPaidByLeaseMonth.get(`${lease.id}-${monthKey}`) ?? 0;

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
              type: isOverdue ? "OVERDUE" : "UPCOMING",
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

  // 5. Lease Start / Expiry Reminders
  for (const lease of ownedLeases) {
    const leaseStart = String(lease.agreementStartsOn).slice(0, 10);
    const leaseEnd = lease.agreementEndsOn
      ? String(lease.agreementEndsOn).slice(0, 10)
      : null;

    const unit = unitMap.get(lease.unitId);
    const tenant = tenantMap.get(lease.tenantId);
    const property = unit
      ? propertyMap.get(unit.propertyId)
      : null;

    if (!unit || !tenant || !property) continue;

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

  const readIds = new Set(
    readRecords.map((record) => record.activityId)
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
    (item) => !item.isRead
  ).length;

  timings.total = Math.round(performance.now() - startedAt);
  console.log("[Activity API timings]", timings);

  return Response.json({
    activity: activityWithReadStatus.slice(0, 20),
    unreadCount,
  });
}