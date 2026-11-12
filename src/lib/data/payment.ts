import "server-only";
import { db } from "@/prisma/db";

export async function getPaymentsForUser(
  userId: string,
  requestedUnitId?: number
) {
  // Step 1: Run Property and Tenant lookups in parallel
  const [properties, allTenants] = await Promise.all([
    db.orm.public.Property.where({ userId }).all(),
    db.orm.public.Tenant.where({ userId }).all(),
  ]);

  if (properties.length === 0) {
    return [];
  }

  const propertyIds = properties.map((property) => property.id);

  // Step 2: Fetch Units for these properties
  const units = await db.orm.public.Unit
    .where((unit) => unit.propertyId.in(propertyIds))
    .all();

  const filteredUnits = requestedUnitId
    ? units.filter((unit) => unit.id === requestedUnitId)
    : units;

  const unitIds = filteredUnits.map((unit) => unit.id);

  if (unitIds.length === 0) {
    return [];
  }

  // Step 3: Fetch Leases for these units
  const leases = await db.orm.public.Lease
    .where((lease) => lease.unitId.in(unitIds))
    .all();

  const leaseIds = leases.map((lease) => lease.id);

  if (leaseIds.length === 0) {
    return [];
  }

  // Step 4: Fetch Payments for these leases
  const allPayments = await db.orm.public.Payment
    .where((payment) => payment.leaseId.in(leaseIds))
    .all();

  // Indexing with Maps for O(1) in-memory assembly
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const unitMap = new Map(filteredUnits.map((u) => [u.id, u]));
  const tenantMap = new Map(allTenants.map((t) => [t.id, t]));
  const leaseMap = new Map(leases.map((l) => [l.id, l]));

  const payments = [];

  for (const payment of allPayments) {
    const lease = leaseMap.get(payment.leaseId);
    if (!lease) continue;

    const unit = unitMap.get(lease.unitId);
    if (!unit) continue;

    const property = propertyMap.get(unit.propertyId);
    const tenant = tenantMap.get(lease.tenantId);

    if (!property || !tenant) continue;

    payments.push({
      id: payment.id,
      payment: {
        amount: payment.amount,
        paidOn: payment.paidOn,
        createdAt: payment.createdAt,
        month: payment.month,
        method: payment.method,
        paymentType: payment.paymentType,
        note: payment.note,
        editNotes: payment.editNotes,
      },
      lease: {
        id: lease.id,
        rent: lease.rent,
        status: lease.status,
      },
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

  payments.sort((a, b) => {
    const dateDifference =
      new Date(b.payment.createdAt).getTime() -
      new Date(a.payment.createdAt).getTime();

    return dateDifference || Number(b.id) - Number(a.id);
  });

  return payments;
}