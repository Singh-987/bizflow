import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLeaseId = searchParams.get("leaseId");
  const requestedMonth = searchParams.get("month");
  const requestedUnitId = searchParams.get("unitId");

  // CASE 1: Query by specific leaseId
  if (requestedLeaseId) {
    const lease = await db.orm.public.Lease.where({
      id: Number(requestedLeaseId),
    }).first();

    if (!lease) {
      return Response.json([]);
    }

    const [unit, tenant, readings] = await Promise.all([
      db.orm.public.Unit.where({ id: lease.unitId }).first(),
      db.orm.public.Tenant.where({
        id: lease.tenantId,
        userId: session.user.id,
      }).first(),
      db.orm.public.ElectricityReading.where({
        leaseId: lease.id,
      }).all(),
    ]);

    if (!unit || !tenant) {
      return Response.json([]);
    }

    const property = await db.orm.public.Property.where({
      id: unit.propertyId,
      userId: session.user.id,
    }).first();

    if (!property) {
      return Response.json({ error: "Lease not found" }, { status: 404 });
    }

    const sortedReadings = [...readings].sort((a, b) =>
      b.month.localeCompare(a.month)
    );
    const latestReading = sortedReadings[0] ?? null;
    const previousReadingForMonth = requestedMonth
      ? sortedReadings.find((bill) => bill.month < requestedMonth) ?? null
      : null;

    return Response.json([
      {
        lease: {
          id: lease.id,
          rent: lease.rent,
          status: lease.status,
        },
        latestReading: latestReading?.currentReading ?? 0,
        latestPerUnitCharge: latestReading?.perUnitCharge ?? null,
        previousReadingForMonth:
          previousReadingForMonth?.currentReading ?? 0,
        previousPerUnitChargeForMonth:
          previousReadingForMonth?.perUnitCharge ?? null,
        bills: readings.map((bill) => ({
          id: bill.id,
          month: bill.month,
          previousReading: bill.previousReading,
          currentReading: bill.currentReading,
          unitsUsed: bill.unitsUsed,
          perUnitCharge: bill.perUnitCharge,
          electricityBill: bill.electricityBill,
          meterChanged: bill.meterChanged,
        })),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
        },
        property: {
          id: property.id,
          name: property.name,
        },
        unit: {
          id: unit.id,
          number: unit.number,
        },
      },
    ]);
  }

  // CASE 2: Query by specific unitId (Fast Path for Unit Details Page)
  if (requestedUnitId) {
    const unit = await db.orm.public.Unit.where({
      id: Number(requestedUnitId),
    }).first();

    if (!unit) {
      return Response.json([]);
    }

    // Verify property ownership
    const property = await db.orm.public.Property.where({
      id: unit.propertyId,
      userId: session.user.id,
    }).first();

    if (!property) {
      return Response.json([]);
    }

    // Fetch leases for this unit
    const leases = await db.orm.public.Lease.where({
      unitId: unit.id,
    }).all();

    if (!leases.length) {
      return Response.json([]);
    }

    const leaseIds = leases.map((l) => l.id);
    const tenantIds = leases.map((l) => l.tenantId);

    // Fetch readings and tenants concurrently
    const [allReadings, tenants] = await Promise.all([
      db.orm.public.ElectricityReading.where((r) =>
        r.leaseId.in(leaseIds)
      ).all(),
      db.orm.public.Tenant.where((t) => t.id.in(tenantIds)).all(),
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));
    const readingsByLease = new Map<number, typeof allReadings>();

    for (const reading of allReadings) {
      const list = readingsByLease.get(reading.leaseId) ?? [];
      list.push(reading);
      readingsByLease.set(reading.leaseId, list);
    }

    const results = [];
    for (const lease of leases) {
      const tenant = tenantMap.get(lease.tenantId);
      if (!tenant) continue;

      const readings = readingsByLease.get(lease.id) ?? [];
      const sortedReadings = [...readings].sort((a, b) =>
        b.month.localeCompare(a.month)
      );
      const latestReading = sortedReadings[0] ?? null;

      results.push({
        lease: {
          id: lease.id,
          rent: lease.rent,
          status: lease.status,
        },
        latestReading: latestReading?.currentReading ?? 0,
        latestPerUnitCharge: latestReading?.perUnitCharge ?? null,
        previousReadingForMonth: 0,
        previousPerUnitChargeForMonth: null,
        bills: readings.map((bill) => ({
          id: bill.id,
          month: bill.month,
          previousReading: bill.previousReading,
          currentReading: bill.currentReading,
          unitsUsed: bill.unitsUsed,
          perUnitCharge: bill.perUnitCharge,
          electricityBill: bill.electricityBill,
          meterChanged: bill.meterChanged,
        })),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
        },
        property: {
          id: property.id,
          name: property.name,
        },
        unit: {
          id: unit.id,
          number: unit.number,
        },
      });
    }

    return Response.json(results);
  }

  // CASE 3: All properties / units for owner
  const [properties, allTenants] = await Promise.all([
    db.orm.public.Property.where({ userId: session.user.id }).all(),
    db.orm.public.Tenant.where({ userId: session.user.id }).all(),
  ]);

  if (!properties.length) {
    return Response.json([]);
  }

  const propertyIds = properties.map((p) => p.id);
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const tenantMap = new Map(allTenants.map((t) => [t.id, t]));

  const units = await db.orm.public.Unit.where((u) =>
    u.propertyId.in(propertyIds)
  ).all();

  if (!units.length) {
    return Response.json([]);
  }

  const unitIds = units.map((u) => u.id);
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const leases = await db.orm.public.Lease.where((l) =>
    l.unitId.in(unitIds)
  ).all();

  if (!leases.length) {
    return Response.json([]);
  }

  const leaseIds = leases.map((l) => l.id);
  const readings = await db.orm.public.ElectricityReading.where((r) =>
    r.leaseId.in(leaseIds)
  ).all();

  const readingsByLease = new Map<number, typeof readings>();
  for (const reading of readings) {
    const list = readingsByLease.get(reading.leaseId) ?? [];
    list.push(reading);
    readingsByLease.set(reading.leaseId, list);
  }

  const electricity = [];
  for (const lease of leases) {
    const unit = unitMap.get(lease.unitId);
    const tenant = tenantMap.get(lease.tenantId);
    if (!unit || !tenant) continue;

    const property = propertyMap.get(unit.propertyId);
    if (!property) continue;

    const leaseReadings = readingsByLease.get(lease.id) ?? [];
    const sortedReadings = [...leaseReadings].sort((a, b) =>
      b.month.localeCompare(a.month)
    );
    const latestReading = sortedReadings[0] ?? null;

    electricity.push({
      lease: {
        id: lease.id,
        rent: lease.rent,
        status: lease.status,
      },
      latestReading: latestReading?.currentReading ?? 0,
      latestPerUnitCharge: latestReading?.perUnitCharge ?? null,
      previousReadingForMonth: 0,
      previousPerUnitChargeForMonth: null,
      bills: leaseReadings.map((bill) => ({
        id: bill.id,
        month: bill.month,
        previousReading: bill.previousReading,
        currentReading: bill.currentReading,
        unitsUsed: bill.unitsUsed,
        perUnitCharge: bill.perUnitCharge,
        electricityBill: bill.electricityBill,
        meterChanged: bill.meterChanged,
      })),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
      },
      property: {
        id: property.id,
        name: property.name,
      },
      unit: {
        id: unit.id,
        number: unit.number,
      },
    });
  }

  return Response.json(electricity);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const leaseId = Number(body.leaseId);
  const currentReading = Number(body.currentReading);
  const requestedPerUnitCharge =
    body.perUnitCharge === undefined || body.perUnitCharge === ""
      ? null
      : Number(body.perUnitCharge);
  const meterChanged = Boolean(body.meterChanged);

  if (!leaseId) {
    return Response.json({ error: "leaseId is required" }, { status: 400 });
  }
  if (!Number.isFinite(currentReading) || currentReading < 0) {
    return Response.json(
      { error: "Current reading must be a valid non-negative number" },
      { status: 400 }
    );
  }
  if (!body.month) {
    return Response.json(
      { error: "Bill month is required." },
      { status: 400 }
    );
  }

  const lease = await db.orm.public.Lease.where({ id: leaseId }).first();
  if (!lease) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  const unit = await db.orm.public.Unit.where({ id: lease.unitId }).first();
  if (!unit) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  const property = await db.orm.public.Property.where({
    id: unit.propertyId,
    userId: session.user.id,
  }).first();

  if (!property) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  // Check previous bills and existing bill in parallel
  const [previousBills, existingBill] = await Promise.all([
    db.orm.public.ElectricityReading.where({ leaseId: lease.id }).all(),
    db.orm.public.ElectricityReading.where({
      leaseId: lease.id,
      month: body.month,
    }).first(),
  ]);

  if (existingBill) {
    return Response.json(
      { error: "An electricity Bill already exists for this month." },
      { status: 400 }
    );
  }

  const sortedPreviousBills = [...previousBills]
    .filter((bill) => bill.month < body.month)
    .sort((a, b) => b.month.localeCompare(a.month));

  const previousBill = sortedPreviousBills[0] ?? null;
  const previousReading = previousBill?.currentReading ?? 0;
  const defaultPerUnitCharge = previousBill?.perUnitCharge ?? null;

  const perUnitCharge =
    requestedPerUnitCharge !== null
      ? requestedPerUnitCharge
      : defaultPerUnitCharge;

  if (
    perUnitCharge === null ||
    !Number.isFinite(perUnitCharge) ||
    perUnitCharge <= 0
  ) {
    return Response.json(
      { error: "Per unit charge is required and must be greater than 0." },
      { status: 400 }
    );
  }
  if (!meterChanged && currentReading < previousReading) {
    return Response.json(
      { error: "Current reading cannot be less than previous reading." },
      { status: 400 }
    );
  }

  const unitsUsed = meterChanged
    ? currentReading
    : currentReading - previousReading;
  const electricityBill = unitsUsed * perUnitCharge;

  const electricity = await db.orm.public.ElectricityReading.create({
    leaseId,
    month: body.month,
    previousReading,
    currentReading,
    unitsUsed,
    perUnitCharge,
    electricityBill,
    meterChanged,
  });

  return Response.json(electricity);
}