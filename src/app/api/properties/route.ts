import {db} from "@/prisma/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request){
    const session = await auth.api.getSession({
        headers : await headers(),
    });

    if(!session){
        return Response.json({
            error: "Unauthorized"},
            {status: 401}
        );
    }

    const body= await request.json();

 const property = await db.orm.public.Property.create({
    name: body.name,
    address:body.address,
    userId: session.user.id,
 });

 return Response.json(property);
}
export async function GET(){
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }

    const properties= await db.orm.public.Property
    .where({userId: session.user.id})
    .all();
    return Response.json(properties);
}

export async function PATCH(request: Request){
    const session= await auth.api.getSession({
        headers: await headers(),
    });

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }

    const body= await request.json();

    const propertyId= Number(body.propertyId);
    if(!propertyId){
        return Response.json(
            {error: "PropertyId is required"},
            {status: 400}
        );
    }
    const property = await db.orm.public.Property
    .where({
        id: propertyId,
        userId: session.user.id,
    })
    .first();

    if(!property){
        return Response.json(
            {error: "Property not found"},
            {status: 404},
        );
    }
    if(!body.name || !body.address){
        return Response.json(
            {error: "Name and address are required"},
            {status: 400}
        )
    }
    await db.orm.public.Property
    .where({
        id: propertyId,
    })
    .update({
        name: body.name,
        address: body.address,
    });
    return Response.json({
        updated: true,
        propertyId,
        name: body.name,
        address: body.address
    });
}

export async function DELETE(request:Request) {
    const session= await auth.api.getSession({
        headers: await headers(),
    });
    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401},
        );
    }
    const body = await request.json();
    const propertyId= Number(body.propertyId);
    if(!propertyId){
        return Response.json(
            {error: "propertyId is required"},
            {status: 400}
        )
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
    await db.orm.public.Property
    .where({
        id: propertyId,
    })
    .delete()
    return Response.json({
        deleted: true,
        propertyId
    });
}