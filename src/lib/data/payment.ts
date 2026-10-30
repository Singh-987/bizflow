import "server-only";

import { db } from "@/prisma/db";

export async function getPaymentsForUser(
userId: string,
requestedUnitId?: number
) {
const properties = await db.orm.public.Property
.where({
userId,
})
.all();

if (properties.length === 0) {
    return [];
}

const propertyIds = new Set(
    properties.map((property) => property.id)
);

const [units, allTenants] = await Promise.all([
    db.orm.public.Unit
        .where((unit) => unit.propertyId.in([...propertyIds]))
        .all(),
    db.orm.public.Tenant
        .where({
            userId,
        })
        .all(),
]);

const filteredUnits = requestedUnitId
    ? units.filter((unit) => unit.id === requestedUnitId)
    : units;

const unitIds = new Set(
    filteredUnits.map((unit) => unit.id)
);

if (unitIds.size === 0) {
    return [];
}

const leases = await db.orm.public.Lease
    .where((lease) => lease.unitId.in([...unitIds]))
    .all();

const leaseIds = new Set(
    leases.map((lease) => lease.id)
);

if (leaseIds.size === 0) {
    return [];
}

const allPayments = await db.orm.public.Payment
    .where((payment) => payment.leaseId.in([...leaseIds]))
    .all();

const propertyMap = new Map(
    properties.map((property) => [
        property.id,
        property,
    ])
);

const unitMap = new Map(
    filteredUnits.map((unit) => [
        unit.id,
        unit,
    ])
);

const tenantMap = new Map(
    allTenants.map((tenant) => [
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
            type: payment.type,
            note: payment.note,
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
