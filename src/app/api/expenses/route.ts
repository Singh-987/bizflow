import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";
import { headers } from "next/headers";

export async function GET(){
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
    const expenses=[];
    for(const property of properties){
        const propertyExpenses= await db.orm.public.Expense
        .where({
            propertyId: property.id,
        })
        .all();
        for(const expense of propertyExpenses){
            expenses.push({
                id: expense.id,
                amount: expense.amount,
                date: expense.date,
                category: expense.category,
                note: expense.note,
                createdAt: expense.createdAt,
                property:{
                    id:property.id,
                    name: property.name
                }
            })
        }
    }
expenses.sort((a, b) => {
    const dateDifference =
        new Date(b.date).getTime() -
        new Date(a.date).getTime();

    if (dateDifference !== 0) {
        return dateDifference;
    }

    const createdDifference =
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime();

    return createdDifference || Number(b.id) - Number(a.id);
});

return Response.json(expenses);}

export async function POST(request:Request) {
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
            {error: "propertyId is required"},
            {status: 400}
        );
    }
    const amount= Number(body.amount);

    if(amount<=0){
        return Response.json(
            {error: "Amount should be greater than 0"},
            {status: 400}
        );
    }
    if(!body.date){
        return Response.json(
            {error: "Date is required"},
            {status: 400}
        );
    }
    if(!body.category){
        return Response.json(
            {error: "Category is required"},
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
    const expense = await db.orm.public.Expense.create({
        propertyId: property.id,
        amount,
        date: body.date,
        category: body.category,
        note: body.note|| null,

    });

    await db.orm.public.ActivityLog.create({
        userId: session.user.id,
        entityType: "EXPENSE",
        entityId: String(expense.id),
        action: "CREATED",
        title: "Expense Added",
        description: `₹${amount.toLocaleString("en-IN")} expense recorded for ${property.name} (${body.category}).`,
        href: `/expenses?highlight=expense-${expense.id}`,
    });

    return Response.json(expense, {status: 201});
}