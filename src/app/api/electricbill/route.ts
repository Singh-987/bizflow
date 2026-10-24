import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(request: Request){
    const session= await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }
    const {searchParams}= new URL(request.url);
    const requestedLeaseId= searchParams.get("leaseId");
    const requestedMonth= searchParams.get("month");
    const requestedUnitId = searchParams.get("unitId");
    if (requestedLeaseId) {
    const lease = await db.orm.public.Lease
        .where({
            id: Number(requestedLeaseId),
        })
        .first();

    if (!lease) {
        return Response.json([]);
    }

    const unit = await db.orm.public.Unit
        .where({
            id: lease.unitId,
        })
        .first();

    if (!unit) {
        return Response.json([]);
    }

    const property = await db.orm.public.Property
        .where({
            id: unit.propertyId,
            userId: session.user.id,
        })
        .first();

    if (!property) {
        return Response.json(
            { error: "Lease not found" },
            { status: 404 }
        );
    }

    const tenant = await db.orm.public.Tenant
        .where({
            id: lease.tenantId,
            userId: session.user.id,
        })
        .first();

    if (!tenant) {
        return Response.json([]);
    }

    const readings = await db.orm.public.ElectricityReading
        .where({
            leaseId: lease.id,
        })
        .all();

    const sortedReadings = [...readings].sort(
        (a, b) => b.month.localeCompare(a.month)
    );

    const latestReading = sortedReadings[0] ?? null;

    const previousReadingForMonth = requestedMonth
        ? sortedReadings.find(
            (bill) => bill.month < requestedMonth
        ) ?? null
        : null;

    return Response.json([
        {
            lease: {
                id: lease.id,
                rent: lease.rent,
                status: lease.status,
            },
            latestReading: latestReading?.currentReading ?? 0,
            latestPerUnitCharge:
                latestReading?.perUnitCharge ?? null,
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
    const properties= await db.orm.public.Property
    .where({
        userId: session.user.id,
    })
    .all();
    const electricity=[]
    for(const property of properties){
        const units = await db.orm.public.Unit
        .where({
            propertyId: property.id,
        })
        .all();
        const filteredUnits = requestedUnitId
            ? units.filter((unit)=> unit.id === Number(requestedUnitId))
            : units;

        for(const unit of filteredUnits){
            const leases= await db.orm.public.Lease
            .where({
                unitId: unit.id,
            })
            .all();
        for(const lease of leases){
             const tenant = await db.orm.public.Tenant
            .where({
                id: lease.tenantId,
                userId: session.user.id,
            })
            .first();
            if(!tenant){
                continue;
            }
           const electricityReading = await db.orm.public.ElectricityReading
           .where({
            leaseId: lease.id,
           })
           .all();

           const sortedReadings= [...electricityReading].sort(
            (a,b)=> b.month.localeCompare(a.month)
           );

           const latestReading = sortedReadings[0] ?? null;
           const previousReadingForMonth=
                requestedLeaseId=== String(lease.id) && requestedMonth
                ? sortedReadings.find(
                    (bill)=> bill.month <requestedMonth
                ) ?? null
                : null;
           electricity.push({
            lease:{
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
            bills: electricityReading.map((bill)=>({
                id: bill.id,
                month: bill.month,
                previousReading: bill.previousReading,
                currentReading: bill.currentReading,
                unitsUsed: bill.unitsUsed,
                perUnitCharge: bill.perUnitCharge,
                electricityBill: bill.electricityBill,
                meterChanged: bill.meterChanged,
            })),
            tenant:{
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
        }
    }

    return Response.json(electricity);
}

export async function  POST(request: Request){
    const session= await auth.api.getSession({
        headers: await headers()
    })
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status:401},
        );
    }

   const body = await request.json();

   const leaseId = Number(body.leaseId);
   const currentReading = Number(body.currentReading);
   const requestedPerUnitCharge =
         body.perUnitCharge === undefined ||
         body.perUnitCharge === ""
         ? null
         : Number(body.perUnitCharge);
   const meterChanged = Boolean(body.meterChanged);

    if(!leaseId){
        return Response.json(
            {error: "leaseId is required"},
            {status: 400},
        );
    }
     if(!Number.isFinite(currentReading) || currentReading <0){
    return Response.json(
        {error: "Current reading must be a valid non-negative number"},
        {status: 400}
    );
   }
     if(!body.month){
        return Response.json(
            {error: "Bill month is required."},
            {status: 400}
        )
    }
    const lease= await db.orm.public.Lease
    .where({
        id: leaseId,
    })
    .first();

    if(!lease){
        return Response.json(
            {error: "Lease not found"},
            {status: 404}
        );
    }

    const unit= await db.orm.public.Unit
    .where({
        id: lease.unitId,
    })
    .first();
    if(!unit){
        return Response.json(
            {error: "Lease not found"},
            {status: 404},
        );
    }
    const property = await db.orm.public.Property
    .where({
        id: unit.propertyId,
        userId: session.user.id,
    })
    .first();

    if(!property){
        return Response.json(
            {error: "Lease not found"},
            {status: 404}
        );
    }
    const previousBills = await db.orm.public.ElectricityReading
    .where({
        leaseId: lease.id,
    })
    .all();

    const sortedPreviousBills= [...previousBills]
    .filter((bill)=> bill.month <body.month)
    .sort((a,b)=> b.month.localeCompare(a.month));

    const previousBill = sortedPreviousBills[0] ?? null;

    const previousReading = previousBill?.currentReading ?? 0;
    const defaultPerUnitCharge= previousBill?.perUnitCharge ?? null;

    const perUnitCharge = requestedPerUnitCharge !==null
    ? requestedPerUnitCharge
    : defaultPerUnitCharge;

    if(
        perUnitCharge ===null ||
        !Number.isFinite(perUnitCharge) ||
        perUnitCharge <=0
    ){
        return Response.json(
            {error: "Per unit charge is required and must be greater than 0."},
            {status: 400}
        );
    }
    if(!meterChanged && currentReading < previousReading){
        return Response.json(
            {error: "Current reading cannot be less than previous reading."},
            {status: 400}
        )
    }
    const unitsUsed = meterChanged
    ? currentReading
    : currentReading- previousReading;

    const electricityBill= unitsUsed* perUnitCharge;

    const exisitingBill = await db.orm.public.ElectricityReading
    .where({
        leaseId: lease.id,
        month: body.month,
    })
    .first();
    if(exisitingBill){
        return Response.json(
            {error: "An electricity Bill already exists for this month."},
            {status: 400}
        );
    }
    const electricity = await db.orm.public.ElectricityReading.create({
        leaseId,
        month: body.month,
        previousReading,
        currentReading,
        unitsUsed,
        perUnitCharge,
        electricityBill,
        meterChanged,
    })

    return Response.json(electricity)
}