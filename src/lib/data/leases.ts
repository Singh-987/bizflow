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

export async function getLeasesForUser(
  userId: string
): Promise<LeaseListItem[]> {
  // Step 1: Run Property and Tenant lookups in parallel
  const [properties, allTenants] = await Promise.all([
    db.orm.public.Property.where({ userId }).all(),
    db.orm.public.Tenant.where({ userId }).all(),
  ]);

  if (!properties.length) {
    return [];
  }

  const propertyIds = properties.map((p) => p.id);
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const tenantMap = new Map(allTenants.map((t) => [t.id, t]));

  // Step 2: Fetch units for these properties
  const units = await db.orm.public.Unit.where((unit) =>
    unit.propertyId.in(propertyIds)
  ).all();

  if (!units.length) {
    return [];
  }

  const unitIds = units.map((u) => u.id);
  const unitMap = new Map(units.map((u) => [u.id, u]));

  // Step 3: Fetch all leases for these units
  const unitLeases = await db.orm.public.Lease.where((lease) =>
    lease.unitId.in(unitIds)
  ).all();

  if (!unitLeases.length) {
    return [];
  }

  const today = getTodayDate();

  // Track records that need DB status synchronization
  const leasesToActivate: number[] = [];
  const unitsToOccupy: number[] = [];
  const leasesToEnd: number[] = [];

  const leases: LeaseListItem[] = [];

  // Step 4: Pure synchronous mapping in memory (zero DB latency)
  for (const lease of unitLeases) {
    const unit = unitMap.get(lease.unitId);
    const tenant = tenantMap.get(lease.tenantId);

    if (!unit || !tenant) continue;

    const property = propertyMap.get(unit.propertyId);
    if (!property) continue;

    let currentStatus = lease.status;

    // Check for transitions
    if (
      currentStatus === "UPCOMING" &&
      lease.agreementStartsOn.slice(0, 10) <= today
    ) {
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
        type: unit.type,
      },
      agreementStartsOn: lease.agreementStartsOn,
      agreementEndsOn: lease.agreementEndsOn,
      rent: lease.rent,
      securityDeposit: lease.securityDeposit,
      status: currentStatus,
    });
  }

  // Step 5: Flush database state updates asynchronously without blocking the user response
  const syncUpdates = async () => {
    try {
      const updates = [];
      if (leasesToActivate.length) {
        updates.push(
          db.orm.public.Lease.where((l) =>
            l.id.in(leasesToActivate)
          ).update({ status: "ACTIVE" })
        );
      }
      if (unitsToOccupy.length) {
        updates.push(
          db.orm.public.Unit.where((u) =>
            u.id.in(unitsToOccupy)
          ).update({ status: "OCCUPIED" })
        );
      }
      if (leasesToEnd.length) {
        updates.push(
          db.orm.public.Lease.where((l) =>
            l.id.in(leasesToEnd)
          ).update({ status: "ENDED" })
        );
      }
      if (updates.length) {
        await Promise.all(updates);
      }
    } catch (err) {
      console.error("[Lease Status Sync Error]", err);
    }
  };

  // Run the batch sync without blocking return
  syncUpdates();

  return leases;
}