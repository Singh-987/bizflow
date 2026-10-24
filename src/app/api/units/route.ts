import { db } from "@/prisma/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers"

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
    const unitId = searchParams.get("unitId");
    const propertyId = Number(searchParams.get("propertyId"));
    if(unitId){
        const unit = await db.orm.public.Unit
            .where({
                id: Number(unitId),
            })
            .first();
        if(!unit){
            return Response.json(
                {error: "Unit not found."},
                {status: 404}
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
                {error: "Unit not found."},
                {status: 404}
            );
        }
        return Response.json(unit);
    }
    if(!propertyId){
        return Response.json(
            {error: "PropertyId is required"},
            {status: 400}
        );
    }

    const property= await db.orm.public.Property
    .where({
        id:propertyId,
        userId:session.user.id,
    })
    .first();

    if(!property){
        return Response.json(
            {error:"Property not found"},
            {status: 404}
        );
    }
    const units= await db.orm.public.Unit
    .where({
        propertyId,
    })
    .all();

    return Response.json(units);
}

export async function POST(request: Request){
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }

    const body = await request.json();
    const propertyId= Number(body.propertyId);

    if(!propertyId){
        return Response.json(
            {error: "propertyId is required"},
            {status: 400}
        );
    }

    const property= await db.orm.public.Property
    .where({
        id: propertyId,
        userId: session.user.id,
    })
    .first();

    if(!property){
        return Response.json(
            {error: "Property not found"},
            {status: 404}
        );
    }
       const existingUnit = await db.orm.public.Unit
    .where({
        propertyId,
        number: body.number,
    })
    .first();
    if(existingUnit){
        return Response.json(
            {error: `Unit ${body.number} already exists in this property.`},
            {status: 400}
        )
    }
    const unit = await db.orm.public.Unit.create({
        number: body.number,
        type: body.type,
        rent: body.rent,
        status: body.status,
        propertyId,
    });

    return Response.json(unit);

}
export async function PATCH(request:Request){
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401},
        );
    }

    const body= await request.json();
    const unitId= Number(body.unitId);
    if(!unitId){
        return Response.json(
            {error: "unitId is required"},
            {status: 400},
        );
    }
    const unit= await db.orm.public.Unit
    .where({
        id: unitId,
    })
    .first();
    if(!unit){
        return Response.json(
            {error: "Unit not found"},
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
            {error: "Unit not found"},
            {status: 404},
        );
    }
    if(!body.number || !body.type || !body.rent || !body.status){
        return Response.json(
            {error: "Unit number, its type, rent and its status are required"},
            {status: 400}
        )
    }
    const existingUnit = await db.orm.public.Unit
    .where({
        propertyId: unit.propertyId,
        number: body.number,
    })
    .all();
    const duplicateUnit = existingUnit.find((existing)=> existing.id !== unitId);
    if(duplicateUnit){
        return Response.json(
            {error: `Unit ${body.number} already exists in this property.`},
            {status: 400}
        )
    }
    await db.orm.public.Unit
    .where({
        id: unitId
    })
    .update({
        number: body.number,
        type: body.type,
        rent: body.rent,
        status: body.status
    });
    return Response.json({
        updated: true,
        unitId,
        number: body.number,
        type: body.type,
        rent: body.rent,
        status: body.status,
    });
}

export async function DELETE(request: Request){
    const session= await auth.api.getSession({
        headers: await headers(),
    });

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401},
        );
    }

    const body= await request.json();
    const unitId= Number(body.unitId);
    if(!unitId){
        return Response.json(
            {error: "unitId is required"},
            {status: 400}
        );
    }
    const unit= await db.orm.public.Unit
    .where({
        id: unitId,
    })
    .first();
    if(!unit){
        return Response.json(
            {error: "Unit not found"},
            {status: 404}
        );
    }
    const property= await db.orm.public.Property
    .where({
        id: unit.propertyId,
        userId: session.user.id,
    })
    .first();
    if(!property){
        return Response.json(
            {error:"Unit not found"},
            {status: 404}
        )
    }
    await db.orm.public.Unit
    .where({
        id: unitId,
    })
    .delete()
    return Response.json({
        deleted: true,
        unitId
    })
}