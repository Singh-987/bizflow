import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";


export async function GET(request: Request) {
    const searchParams = new URL(request.url).searchParams;
    const requestedUnitId = Number(searchParams.get("unitId"));

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const properties = await db.orm.public.Property
        .where({
            userId: session.user.id,
        })
        .all();

    if (properties.length === 0) {
        return Response.json([]);
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
                userId: session.user.id,
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
        return Response.json([]);
    }

    const leases = await db.orm.public.Lease
        .where((lease) => lease.unitId.in([...unitIds]))
        .all();

    const leaseIds = new Set(
        leases.map((lease) => lease.id)
    );

    if (leaseIds.size === 0) {
        return Response.json([]);
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

    return Response.json(payments);
}



export async function POST(request: Request){
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401},
        );
    }
    const body = await request.json();
    const leaseId = Number(body.leaseId);
    const amount = Number(body.amount);
    const type = body.type || "RENT";

    if(!leaseId){
        return Response.json(
            {error: "leaseId is required"},
            {status: 400},
        );
    }

    if(amount<=0){
        return Response.json(
            {error: "Amount should be greater than 0"},
            {status: 400}
        );
    }

    if(!body.paidOn){
        return Response.json(
            {error: "Payment date is required"},
            {status: 400},
        );
    }

    if(!body.month){
        return Response.json(
            {error: "Payment month is required"},
            {status: 400},
        );
    }

    if(!body.method){
        return Response.json(
            {error: "Payment method is required."},
            {status: 400}
        );
    }

    const lease = await db.orm.public.Lease
    .where({
        id: leaseId,
    })
    .first();

    if(!lease){
        return Response.json(
            {error: "Lease not found"},
            {status: 404}
        )
    }
    const unit = await db.orm.public.Unit
    .where({
        id: lease.unitId,
    })
    .first();

    if(!unit){
        return Response.json(
            {error: "Lease not found"},
            {status: 404}
        )
    }

    const property= await db.orm.public.Property
    .where({
        id: unit.propertyId,
        userId: session.user.id,
    })
    .first();
    if(!property){
        return Response.json(
            {error: "Lease not found"},
            {status: 404}
        )
    }
    const payment = await db.orm.public.Payment.create({
        leaseId,
        amount,
        paidOn: body.paidOn,
        month: body.month,
        method: body.method,
        type,
        note: body.note ||null,
    });

    return Response.json(payment);
}