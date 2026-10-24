import { db } from "@/prisma/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(){
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }

    const tenants= await db.orm.public.Tenant
    .where({
        userId: session.user.id,
    })
    .all();

    return Response.json(tenants);
}

export async function POST(request: Request){
    const session= await auth.api.getSession({
        headers: await headers(),
    });

    if(!session){
        return Response.json(
            {error: "Unauthorized"},
            {status: 401}
        );
    }

    const body = await request.json();
    const tenant= await db.orm.public.Tenant.create({
        name: body.name,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        email: body.email || null,
        govtId: body.govtId || null,
        govtIdFile: body.govtIdFile || null,
        userId: session.user.id,
   });

   return Response.json(tenant);
}

export async function PATCH(request: Request){
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
    const tenantId= Number(body.tenantId);
    if(!tenantId){
        return Response.json(
            {error: "tenantId is required."},
            {status: 400},
        );
    }
    const tenant= await db.orm.public.Tenant
    .where({
        userId: session.user.id,
        id: tenantId,
    })
    .first();
    if(!tenant){
        return Response.json(
            {error: "No tenant found"},
            {status: 404},
        );
    }
    if(!body.name || !body.phone){
        return Response.json(
            {error: "Name and Phone number are required"},
            {status: 400},
        );
    }
    await db.orm.public.Tenant
    .where({
        id: tenantId,
    })
    .update({
        name: body.name,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        email: body.email || null,
        govtId: body.govtId || null,
        govtIdFile: body.govtIdFile ||null,
    })
    return Response.json({
        updated: true,
        name: body.name,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        email: body.email,
        govtId: body.govtId,
        govtIdFile: body.govtIdFile,
        tenantId,
    });
}

export async function DELETE(request: Request) {
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
    const tenantId= Number(body.tenantId);
    if(!tenantId){
        return Response.json(
            {error: "tenantId is required"},
            {status: 400},
        );
    }
    const tenant= await db.orm.public.Tenant
    .where({
        id: tenantId,
        userId: session.user.id,
    })
    .first();
    if(!tenant){
        return Response.json(
            {error: "NO tenant found"},
            {status: 404},
        );
    }
    await db.orm.public.Tenant
    .where({
        id: tenantId,
    })
    .delete();
    return Response.json({
        deleted: true,
        tenantId,
    });
}