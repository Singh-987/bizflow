import { auth } from "@/lib/auth";
import { getLeasesForUser } from "@/lib/data/leases";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

function getTodayDate() {
  const now = new Date();
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const tenantId = searchParams.get("tenantId") ? Number(searchParams.get("tenantId")) : null;
  const unitId = searchParams.get("unitId") ? Number(searchParams.get("unitId")) : null;

  // 1. Fast path for tenant lookup without fetching all user leases
  if (tenantId) {
    const activeLease = await db.orm.public.Lease.where({
      tenantId,
      status: "ACTIVE",
    }).first();

    if (!activeLease) {
      return Response.json({ activeLease: null });
    }

    const unit = await db.orm.public.Unit.where({ id: activeLease.unitId }).first();
    if (!unit) {
      return Response.json({ activeLease: null });
    }

    const property = await db.orm.public.Property.where({
      id: unit.propertyId,
      userId: session.user.id,
    }).first();

    if (!property) {
      return Response.json({ activeLease: null });
    }

    return Response.json({
      activeLease: {
        propertyName: property.name,
        unitNumber: unit.number,
      },
    });
  }

  // 2. Fetch all leases
  const allLeases = await getLeasesForUser(session.user.id);

  if (unitId) {
    return Response.json(allLeases.filter((lease) => lease.unit.id === unitId));
  }

  return Response.json(allLeases);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const tenantId = Number(body.tenantId);
  const unitId = Number(body.unitId);

  if (!tenantId || !unitId) {
    return Response.json(
      { error: "tenantId and unitId is required" },
      { status: 400 }
    );
  }

  // Run tenant check, unit fetch, and existing lease check concurrently
  const [tenant, unit, existingLeases] = await Promise.all([
    db.orm.public.Tenant.where({
      id: tenantId,
      userId: session.user.id,
    }).first(),
    db.orm.public.Unit.where({
      id: unitId,
    }).first(),
    db.orm.public.Lease.where({
      unitId,
    }).all(),
  ]);

  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!unit) {
    return Response.json({ error: "Unit not found" }, { status: 404 });
  }

  // Check property ownership & archived state
  const property = await db.orm.public.Property.where({
    id: unit.propertyId,
    userId: session.user.id,
  }).first();

  if (!property) {
    return Response.json({ error: "Unit not found" }, { status: 404 });
  }

  if (property.isArchived) {
    return Response.json(
      {
        error: "This property is archived. Restore it before creating a new lease.",
        code: "PROPERTY_ARCHIVED",
      },
      { status: 409 }
    );
  }

  if (!body.agreementStartsOn) {
    return Response.json(
      { error: "Agreement start date is required" },
      { status: 400 }
    );
  }

  const newStart = String(body.agreementStartsOn).slice(0, 10);
  const newEnd = body.agreementEndsOn
    ? String(body.agreementEndsOn).slice(0, 10)
    : null;

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(newStart) ||
    Number.isNaN(Date.parse(`${newStart}T00:00:00Z`))
  ) {
    return Response.json(
      { error: "A valid agreement start date is required." },
      { status: 400 }
    );
  }

  if (
    newEnd &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(newEnd) ||
      Number.isNaN(Date.parse(`${newEnd}T00:00:00Z`)) ||
      newEnd <= newStart)
  ) {
    return Response.json(
      { error: "Agreement end date must be a valid date after the start date." },
      { status: 400 }
    );
  }

  const today = getTodayDate();
  const calculatedStatus = newStart > today ? "UPCOMING" : "ACTIVE";

  if (Number(body.rent) <= 0) {
    return Response.json(
      { error: "Rent must be greater than 0" },
      { status: 400 }
    );
  }

  const securityDeposit =
    body.securityDeposit === undefined ||
    body.securityDeposit === null ||
    body.securityDeposit === ""
      ? 0
      : Number(body.securityDeposit);

  if (!Number.isInteger(securityDeposit) || securityDeposit < 0) {
    return Response.json(
      { error: "Security Deposit cannot be negative" },
      { status: 400 }
    );
  }

  // Validate overlaps against existing leases
  for (const existingLease of existingLeases) {
    const existingStartDate = existingLease.agreementStartsOn.slice(0, 10);
    const existingEndDate = existingLease.agreementEndsOn
      ? existingLease.agreementEndsOn.slice(0, 10)
      : null;

    const overlaps =
      (!newEnd || existingStartDate < newEnd) &&
      (!existingEndDate || newStart < existingEndDate);

    if (overlaps) {
      return Response.json(
        {
          error: "Lease dates overlap with an existing lease for this unit.",
          conflictingLeaseId: existingLease.id,
        },
        { status: 400 }
      );
    }
  }

  const lease = await db.orm.public.Lease.create({
    tenantId,
    unitId,
    agreementStartsOn: body.agreementStartsOn,
    agreementEndsOn: body.agreementEndsOn || null,
    rent: Number(body.rent),
    securityDeposit,
    status: calculatedStatus,
  });

  if (calculatedStatus === "ACTIVE") {
    await db.orm.public.Unit.where({ id: unit.id }).update({
      status: "OCCUPIED",
    });
  }

  return Response.json(lease);
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const leaseId = Number(body.leaseId);

  if (!leaseId) {
    return Response.json({ error: "leaseId is required" }, { status: 400 });
  }

  const lease = await db.orm.public.Lease.where({ id: leaseId }).first();
  if (!lease) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  // Fetch unit and tenant concurrently
  const [tenant, unit] = await Promise.all([
    db.orm.public.Tenant.where({
      id: lease.tenantId,
      userId: session.user.id,
    }).first(),
    db.orm.public.Unit.where({
      id: lease.unitId,
    }).first(),
  ]);

  if (!tenant || !unit) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  const property = await db.orm.public.Property.where({
    id: unit.propertyId,
    userId: session.user.id,
  }).first();

  if (!property) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }

  const action = body.action;
  if (action !== "END" && action !== "EXTEND") {
    return Response.json({ error: "Invalid lease action" }, { status: 400 });
  }

  if (action === "EXTEND") {
    if (lease.status === "ENDED") {
      return Response.json(
        { error: "Cannot extend an ended lease" },
        { status: 400 }
      );
    }

    if (!body.agreementEndsOn) {
      return Response.json(
        { error: "New agreement end date is required" },
        { status: 400 }
      );
    }

    if (
      lease.agreementEndsOn &&
      body.agreementEndsOn <= lease.agreementEndsOn
    ) {
      return Response.json(
        { error: "New end date must be later than the current end date" },
        { status: 400 }
      );
    }

    if (body.agreementEndsOn <= lease.agreementStartsOn) {
      return Response.json(
        { error: "End date must be after the start date" },
        { status: 400 }
      );
    }

    const existingLeases = await db.orm.public.Lease.where({
      unitId: lease.unitId,
    }).all();

    for (const existingLease of existingLeases) {
      if (existingLease.id === lease.id) continue;

      const existingStart = existingLease.agreementStartsOn;
      const existingEnd = existingLease.agreementEndsOn;

      const overlaps =
        (!body.agreementEndsOn || existingStart < body.agreementEndsOn) &&
        (!existingEnd || lease.agreementStartsOn < existingEnd);

      if (overlaps) {
        return Response.json(
          {
            error: "Lease dates overlap with an existing lease for this unit.",
            conflictingLeaseId: existingLease.id,
          },
          { status: 400 }
        );
      }
    }

    const updatedLease = await db.orm.public.Lease.where({
      id: leaseId,
    }).update({
      agreementEndsOn: body.agreementEndsOn,
    });

    return Response.json(updatedLease);
  }

  if (lease.status === "ENDED") {
    return Response.json(
      { error: "Lease is already ended" },
      { status: 400 }
    );
  }

  // Update lease and unit in parallel
  await Promise.all([
    db.orm.public.Lease.where({ id: leaseId }).update({
      status: "ENDED",
      agreementEndsOn: new Date().toISOString(),
    }),
    db.orm.public.Unit.where({ id: unit.id }).update({
      status: "VACANT",
    }),
  ]);

  return Response.json({
    success: true,
    leaseId,
    status: "ENDED",
    unitId: unit.id,
    unitStatus: "VACANT",
  });
}