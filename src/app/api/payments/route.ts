import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(request: Request){
    const searchParams = new URL(request.url).searchParams;
    const requestedUnitId = Number(searchParams.get("unitId"));
    const session= await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401},
        );
    }
    const properties= await db.orm.public.Property
    .where({
        userId: session.user.id,
    })
    .all();
    const payments= [];
    const allPayments = await db.orm.public.Payment
        .all();
        const allTenants = await db.orm.public.Tenant
        .where({
            userId: session.user.id,
        })
        .all();
    for(const property of properties){
        const units = await db.orm.public.Unit
        .where({
            propertyId: property.id,
        })
        .all();
        const filteredUnits = requestedUnitId ? units.filter((unit)=> unit.id === requestedUnitId): units;
    for(const unit of filteredUnits){
        const leases = await db.orm.public.Lease
        .where({
            unitId: unit.id,
        })
        .all();
    for(const lease of leases){
        const tenant = allTenants.find((tenant)=> tenant.id === lease.tenantId);
        if(!tenant){
            continue;
        }
        const leasePayments= allPayments.filter(
            (payment)=> payment.leaseId === lease.id
        )
        .sort((a, b)=>
            new Date(b.paidOn).getTime()-
            new Date(a.paidOn).getTime()
        );

        for(const payment of leasePayments){
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

                lease:{
                    id: lease.id,
                    rent: lease.rent,
                    status: lease.status,
                },
                tenant:{
                    id: tenant.id,
                    name: tenant.name,
                    phone: tenant.phone,
                },
                property:{
                    id: property.id,
                    name: property.name,
                },
                unit:{
                    id: unit.id,
                    number: unit.number,
                },
            });
        }
    }
    }
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