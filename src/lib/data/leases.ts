import "server-only";
import { db } from "@/prisma/db";

function getTodayDate() {
  const now = new Date();
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

export type LeaseListItem = {
  id: number;
  tenant: {
    id: number;
    name: string;
    phone: string;
  };
  property: {
    id: number;
    name: string;
  };
  unit: {
    id: number;
    number: number;
    type: string;
  };
  agreementStartsOn: string;
  agreementEndsOn: string | null;
  rent: number;
  securityDeposit: number;
  status: string;
};

export async function getLeasesForUser(userId: string): Promise<LeaseListItem[]> {
  const [properties, allTenants] = await Promise.all([
    db.orm.public.Property.where({ userId }).all(),
    db.orm.public.Tenant.where({ userId }).all(),
  ]);

  if (!properties.length) return [];

  const propertyIds = properties.map((p) => p.id);
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const tenantMap = new Map(allTenants.map((t) => [t.id, t]));

  const units = await db.orm.public.Unit.where((unit) =>
    unit.propertyId.in(propertyIds)
  ).all();

  if (!units.length) return [];

  const unitIds = units.map((u) => u.id);
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const unitLeases = await db.orm.public.Lease.where((lease) =>
    lease.unitId.in(unitIds)
  ).all();

  if (!unitLeases.length) return [];

  const today = getTodayDate();
  const leasesToActivate: number[] = [];
  const unitsToOccupy: number[] = [];
  const leasesToEnd: number[] = [];
  const leases: LeaseListItem[] = [];

  for (const lease of unitLeases) {
    const unit = unitMap.get(lease.unitId);
    const tenant = tenantMap.get(lease.tenantId);
    if (!unit || !tenant) continue;

    const property = propertyMap.get(unit.propertyId);
    if (!property) continue;

    let currentStatus = lease.status;

    if (currentStatus === "UPCOMING" && lease.agreementStartsOn.slice(0, 10) <= today) {
      currentStatus = "ACTIVE";
      leasesToActivate.push(lease.id);
      unitsToOccupy.push(unit.id);
    } else if (
      currentStatus === "ACTIVE" &&
      lease.agreementEndsOn &&
      lease.agreementEndsOn.slice(0, 10) <= today
    ) {
      currentStatus = "ENDED";
      leasesToEnd.push(lease.id);
    }

    leases.push({
      id: lease.id,
      tenant: { id: tenant.id, name: tenant.name, phone: tenant.phone },
      property: { id: property.id, name: property.name },
      unit: { id: unit.id, number: unit.number, type: unit._type },
      agreementStartsOn: lease.agreementStartsOn,
      agreementEndsOn: lease.agreementEndsOn,
      rent: lease.rent,
      securityDeposit: lease.securityDeposit,
      status: currentStatus,
    });
  }

  // Await pending updates before resolving so the serverless function exits cleanly
  const updates = [];
  if (leasesToActivate.length) {
    updates.push(
      db.orm.public.Lease.where((l) => l.id.in(leasesToActivate)).update({ status: "ACTIVE" })
    );
  }
  if (unitsToOccupy.length) {
    updates.push(
      db.orm.public.Unit.where((u) => u.id.in(unitsToOccupy)).update({ status: "OCCUPIED" })
    );
  }
  if (leasesToEnd.length) {
    updates.push(
      db.orm.public.Lease.where((l) => l.id.in(leasesToEnd)).update({ status: "ENDED" })
    );
  }
  if (updates.length) {
    await Promise.allSettled(updates);
  }

  return leases;
}

// Add direct server fetcher for electric bills to avoid client waterfalls
export async function getElectricityBillsForUser(userId: string) {
  try {
    const properties = await db.orm.public.Property.where({ userId }).all();
    if (!properties.length) return [];
    const propertyIds = properties.map((p) => p.id);

    const units = await db.orm.public.Unit.where((u) => u.propertyId.in(propertyIds)).all();
    if (!units.length) return [];
    const unitIds = units.map((u) => u.id);

    const leases = await db.orm.public.Lease.where((l) => l.unitId.in(unitIds)).all();
    if (!leases.length) return [];
    const leaseIds = leases.map((l) => l.id);

    const bills = await db.orm.public.ElectricityReading.where((b) =>
      b.leaseId.in(leaseIds)
    ).all();

    return bills;
  } catch (error) {
    console.error("[getElectricityBillsForUser Error]", error);
    return [];
  }
}