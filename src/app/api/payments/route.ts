import { auth } from "@/lib/auth";
import { getPaymentsForUser } from "@/lib/data/payment";
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

    const payments = await getPaymentsForUser(
        session.user.id,
        requestedUnitId || undefined
    );

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