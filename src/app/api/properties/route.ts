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
export async function GET(request: Request) {
const session = await auth.api.getSession({
headers: await headers(),
});
if (!session) {
    return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
    );
}

const { searchParams } = new URL(request.url);
const archived = searchParams.get("archived") === "true";

const properties = await db.orm.public.Property
    .where({
        userId: session.user.id,
        isArchived: archived,
    })
    .all();

return Response.json(properties);

}


export async function PATCH(request: Request) {
const session = await auth.api.getSession({
headers: await headers(),
});


if (!session) {
    return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
    );
}

const body = await request.json();
const propertyId = Number(body.propertyId);

if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return Response.json(
        { error: "A valid propertyId is required." },
        { status: 400 }
    );
}

const property = await db.orm.public.Property
    .where({
        id: propertyId,
        userId: session.user.id,
    })
    .first();

if (!property) {
    return Response.json(
        { error: "Property not found." },
        { status: 404 }
    );
}

if (body.action === "archive" || body.action === "restore") {
    const isArchived = body.action === "archive";

    await db.orm.public.Property
        .where({
            id: propertyId,
            userId: session.user.id,
        })
        .update({ isArchived });

    return Response.json({
        updated: true,
        propertyId,
        isArchived,
    });
}

if (property.isArchived) {
    return Response.json(
        { error: "Restore this property before editing it." },
        { status: 409 }
    );
}

if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.address !== "string" ||
    !body.address.trim()
) {
    return Response.json(
        { error: "Name and address are required." },
        { status: 400 }
    );
}

await db.orm.public.Property
    .where({
        id: propertyId,
        userId: session.user.id,
    })
    .update({
        name: body.name.trim(),
        address: body.address.trim(),
    });

return Response.json({
    updated: true,
    propertyId,
    name: body.name.trim(),
    address: body.address.trim(),
});


}


export async function DELETE(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const body = await request.json();
    const propertyId = Number(body.propertyId);

    if (!Number.isInteger(propertyId) || propertyId <= 0) {
        return Response.json(
            { error: "A valid propertyId is required." },
            { status: 400 }
        );
    }

    const property = await db.orm.public.Property
        .where({
            id: propertyId,
            userId: session.user.id,
        })
        .first();

    if (!property) {
        return Response.json(
            { error: "Property not found." },
            { status: 404 }
        );
    }

    const units = await db.orm.public.Unit
        .where({ propertyId })
        .all();

    const occupiedUnits = units.filter(
        (unit) => unit.status.toUpperCase() !== "VACANT"
    );

    if (occupiedUnits.length > 0) {
        return Response.json(
            {
                error: "This property cannot be deleted because it contains occupied or otherwise unavailable units. Make sure all units are vacant first.",
                code: "PROPERTY_UNITS_NOT_VACANT",
            },
            { status: 409 }
        );
    }

    for (const unit of units) {
        const leases = await db.orm.public.Lease
            .where({ unitId: unit.id })
            .all();

        if (leases.length > 0) {
            return Response.json(
                {
                    error: "This property cannot be deleted because its units have lease records. Preserve the rental history by keeping this property.",
                    code: "PROPERTY_HAS_LEASE_HISTORY",
                },
                { status: 409 }
            );
        }
    }

    const expenses = await db.orm.public.Expense
        .where({ propertyId })
        .all();

    if (expenses.length > 0) {
        return Response.json(
            {
                error: "This property cannot be deleted because it has expense records. Keep the property to preserve its financial history.",
                code: "PROPERTY_HAS_EXPENSE_HISTORY",
            },
            { status: 409 }
        );
    }

    try {
        await db.orm.public.Property
            .where({
                id: propertyId,
                userId: session.user.id,
            })
            .delete();

        return Response.json({
            deleted: true,
            propertyId,
        });
    } catch (error) {
        console.error("Property deletion failed:", error);

        return Response.json(
            {
                error: "The property could not be deleted because it may still have linked records. No successful deletion was confirmed.",
                code: "PROPERTY_DELETE_FAILED",
            },
            { status: 409 }
        );
    }
}