import {db} from "@//prisma/db";
export async function GET(){
    const users = await db.orm.public.User.all();
    return Response.json(users);
}