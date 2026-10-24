import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

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
    let body: {activityId?: unknown; activityIds?: unknown;};
    try{
        body = await request.json();
    } catch{
        return Response.json(
            {error: "Invalid JSON body"},
            {status: 400},
        );
    }
   const activityIds =
    Array.isArray(body.activityIds)
        ? body.activityIds
        : typeof body.activityId === "string"
            ? [body.activityId]
            : [];

if (
    activityIds.length === 0 ||
    activityIds.some(
        (id) => typeof id !== "string" || !id.trim()
    )
) {
    return Response.json(
        { error: "A valid activityId or activityIds array is required." },
        { status: 400 }
    );
}

for (const activityId of activityIds as string[]) {
    const existing = await db.orm.public.NotificationRead
        .where({
            userId: session.user.id,
            activityId,
        })
        .first();

    if (!existing) {
        await db.orm.public.NotificationRead.create({
            userId: session.user.id,
            activityId,
        });
    }
}

return Response.json({ success: true });
}