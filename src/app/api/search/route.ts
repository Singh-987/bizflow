import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(request:Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
    if(!query){
        return Response.json([]);
    }
    const properties = await db.orm.public.Property
    .where({
        userId: session.user.id,
    })
    .all();

const tenants = await db.orm.public.Tenant
    .where({
        userId: session.user.id,
    })
    .all();

const allUnits = await db.orm.public.Unit.all();
const allLeases = await db.orm.public.Lease.all();
const allPayments = await db.orm.public.Payment.all();

const results = [];

const propertyIds = new Set(
    properties.map((property) => property.id)
);

const units = allUnits.filter((unit) =>
    propertyIds.has(unit.propertyId)
);

const unitIds = new Set(
    units.map((unit) => unit.id)
);

const leases = allLeases.filter((lease) =>
    unitIds.has(lease.unitId)
);

const leaseIds = new Set(
    leases.map((lease) => lease.id)
);

const propertyMap = new Map(
    properties.map((property) => [
        property.id,
        property,
    ])
);

const unitMap = new Map(
    units.map((unit) => [
        unit.id,
        unit,
    ])
);

const tenantMap = new Map(
    tenants.map((tenant) => [
        tenant.id,
        tenant,
    ])
);

const leaseMap = new Map(
    leases.map((lease) => [
        lease.id,
        lease,
    ])
);
for (const property of properties) {
    if (
        property.name.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query)
    ) {
        results.push({
            type: "Property",
            id: property.id,
            title: property.name,
            subtitle: property.address,
            href: `/properties?propertyId=${property.id}`,
        });
    }
}

for (const unit of units) {
    const property = propertyMap.get(unit.propertyId);

    if (!property) {
        continue;
    }

    if (
        unit.number.toString().includes(query) ||
        unit.type.toLowerCase().includes(query)
    ) {
        results.push({
            type: "Unit",
            id: unit.id,
            title: `Unit ${unit.number}`,
            subtitle: property.name,
            href: `/units/${unit.id}`,
        });
    }
}

for (const tenant of tenants) {
    if (
        tenant.name.toLowerCase().includes(query) ||
        tenant.phone.includes(query)
    ) {
        results.push({
            type: "Tenant",
            id: tenant.id,
            title: tenant.name,
            subtitle: tenant.phone,
            href: `/tenants?highlight=tenant-${tenant.id}`,
        });
    }
}

for (const lease of leases) {
    const tenant = tenantMap.get(lease.tenantId);
    const unit = unitMap.get(lease.unitId);

    if (!tenant || !unit) {
        continue;
    }

    const property = propertyMap.get(unit.propertyId);

    if (!property) {
        continue;
    }

    if (
        tenant.name.toLowerCase().includes(query) ||
        property.name.toLowerCase().includes(query) ||
        unit.number.toString().includes(query)
    ) {
        results.push({
            type: "Lease",
            id: lease.id,
            title: `Lease ${lease.id}`,
            subtitle:
                `${tenant.name} · ` +
                `${property.name} · ` +
                `Unit ${unit.number}`,
            href: `/leases?leaseId=${lease.id}`,
        });
    }
}

for (const payment of allPayments) {
    if (!leaseIds.has(payment.leaseId)) {
        continue;
    }

    const lease = leaseMap.get(payment.leaseId);

    if (!lease) {
        continue;
    }

    const unit = unitMap.get(lease.unitId);

    if (!unit) {
        continue;
    }

    const property = propertyMap.get(unit.propertyId);
    const tenant = tenantMap.get(lease.tenantId);

    if (!property || !tenant) {
        continue;
    }

    if (
        payment.amount.toString().includes(query) ||
        payment.month.toLowerCase().includes(query) ||
        payment.method.toLowerCase().includes(query) ||
        payment.type.toLowerCase().includes(query) ||
        tenant.name.toLowerCase().includes(query) ||
        property.name.toLowerCase().includes(query) ||
        unit.number.toString().includes(query)
    ) {
        results.push({
            type: "Payment",
            id: payment.id,
            title: `₹${payment.amount}`,
            subtitle:
                `${payment.type} · ` +
                `${tenant.name} · ` +
                `${property.name} · ` +
                `Unit ${unit.number}`,
            href: `/payments?highlight=payment-${payment.id}`,
        });
    }
}
    return Response.json(results.slice(0,10));

}