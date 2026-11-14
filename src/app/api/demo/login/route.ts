import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/prisma/db";

const DEMO_EMAIL = "demo@rentello.in";
const DEMO_PASSWORD = "DemoUser@2026!";
const DEMO_NAME = "Aarav Sharma (Demo)";

function getMonthString(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function POST() {
  try {
    let demoUser = await db.orm.public.User.where({
      email: DEMO_EMAIL,
    }).first();

    // First-time setup: create demo user + sample portfolio
    if (!demoUser) {
      await auth.api.signUpEmail({
        body: {
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          name: DEMO_NAME,
        },
      });

      demoUser = await db.orm.public.User.where({
        email: DEMO_EMAIL,
      }).first();

      if (!demoUser) {
        return NextResponse.json(
          { error: "Failed to initialize demo account." },
          { status: 500 }
        );
      }

      const userId = demoUser.id;
      const currentMonth = getMonthString(0);
      const prevMonth = getMonthString(-1);
      const nowIso = new Date().toISOString();

      // 1. Create 2 Properties
      const prop1 = await db.orm.public.Property.create({
        name: "Greenwood Residency",
        address: "Sector 62, Noida, UP",
        notes: "12-unit residential apartment block",
        isArchived: false,
        userId,
      });

      const prop2 = await db.orm.public.Property.create({
        name: "Sunrise Enclave",
        address: "Indirapuram, Ghaziabad, UP",
        notes: "Independent builder floors",
        isArchived: false,
        userId,
      });

      // 2. Create 4 Units (3 Occupied, 1 Vacant)
      const unit101 = await db.orm.public.Unit.create({
        number: 101,
        propertyId: prop1.id,
        rent: 12000,
        status: "OCCUPIED",
        _type: "2BHK",
      });

      const unit102 = await db.orm.public.Unit.create({
        number: 102,
        propertyId: prop1.id,
        rent: 8500,
        status: "OCCUPIED",
        _type: "1BHK",
      });

      await db.orm.public.Unit.create({
        number: 103,
        propertyId: prop1.id,
        rent: 9000,
        status: "VACANT",
        _type: "1BHK",
      });

      const unit201 = await db.orm.public.Unit.create({
        number: 201,
        propertyId: prop2.id,
        rent: 15000,
        status: "OCCUPIED",
        _type: "3BHK",
      });

      // 3. Create 3 Tenants (Masked KYC format)
      const tenant1 = await db.orm.public.Tenant.create({
        name: "Kunal Malhotra",
        phone: "9876543210",
        alternatePhone: "9811122233",
        email: "kunal.m@example.com",
        govtId: "XXXX-XXXX-4821",
        govtIdFile: null,
        userId,
      });

      const tenant2 = await db.orm.public.Tenant.create({
        name: "Pooja Verma",
        phone: "9899887766",
        alternatePhone: "",
        email: "pooja.v@example.com",
        govtId: "ABCDE1234F",
        govtIdFile: null,
        userId,
      });

      const tenant3 = await db.orm.public.Tenant.create({
        name: "Rohan Nair",
        phone: "9911223344",
        alternatePhone: "9955667788",
        email: "rohan.nair@example.com",
        govtId: "XXXX-XXXX-9034",
        govtIdFile: null,
        userId,
      });

      // 4. Create 3 Active Leases
      const lease1 = await db.orm.public.Lease.create({
        tenantId: tenant1.id,
        unitId: unit101.id,
        rent: 12000,
        securityDeposit: 24000,
        agreementStartsOn: "2026-01-01T00:00:00.000Z",
        agreementEndsOn: "2026-12-31T00:00:00.000Z",
        status: "ACTIVE",
      });

      const lease2 = await db.orm.public.Lease.create({
        tenantId: tenant2.id,
        unitId: unit102.id,
        rent: 8500,
        securityDeposit: 17000,
        agreementStartsOn: "2026-03-01T00:00:00.000Z",
        agreementEndsOn: "2027-02-28T00:00:00.000Z",
        status: "ACTIVE",
      });

      const lease3 = await db.orm.public.Lease.create({
        tenantId: tenant3.id,
        unitId: unit201.id,
        rent: 15000,
        securityDeposit: 30000,
        agreementStartsOn: "2026-05-01T00:00:00.000Z",
        agreementEndsOn: "2027-04-30T00:00:00.000Z",
        status: "ACTIVE",
      });

      // 5. Add Electricity Readings for Current Month
      await db.orm.public.ElectricityReading.create({
        leaseId: lease1.id,
        month: currentMonth,
        previousReading: 1240,
        currentReading: 1390,
        unitsUsed: 150,
        perUnitCharge: 8,
        electricityBill: 1200,
        meterChanged: false,
      });

      await db.orm.public.ElectricityReading.create({
        leaseId: lease2.id,
        month: currentMonth,
        previousReading: 810,
        currentReading: 900,
        unitsUsed: 90,
        perUnitCharge: 8,
        electricityBill: 720,
        meterChanged: false,
      });

      // 6. Add Sample Payments (Current + Previous Month)
      await db.orm.public.Payment.create({
        leaseId: lease1.id,
        amount: 12000,
        method: "UPI",
        month: currentMonth,
        paidOn: nowIso,
        paymentType: "RENT",
        note: "Paid on time via GPay",
        editNotes: null,
      });

      await db.orm.public.Payment.create({
        leaseId: lease1.id,
        amount: 1200,
        method: "UPI",
        month: currentMonth,
        paidOn: nowIso,
        paymentType: "ELECTRICITY",
        note: "Sub-meter 150 units @ Rs.8",
        editNotes: null,
      });

      await db.orm.public.Payment.create({
        leaseId: lease2.id,
        amount: 5000,
        method: "CASH",
        month: currentMonth,
        paidOn: nowIso,
        paymentType: "RENT",
        note: "Partial rent; Rs. 3,500 balance pending",
        editNotes: null,
      });

      await db.orm.public.Payment.create({
        leaseId: lease1.id,
        amount: 12000,
        method: "BANK_TRANSFER",
        month: prevMonth,
        paidOn: nowIso,
        paymentType: "RENT",
        note: "NEFT settled",
        editNotes: null,
      });

      // 7. Add 1 Property Expense
      await db.orm.public.Expense.create({
        propertyId: prop1.id,
        category: "Maintenance",
        amount: 1850,
        date: nowIso.slice(0, 10),
        note: "Main gate intercom & water pump servicing",
      });
    }

    return NextResponse.json({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
  } catch (error) {
    console.error("DEMO LOGIN INIT ERROR:", error);
    return NextResponse.json(
      { error: "Unable to start demo session." },
      { status: 500 }
    );
  }
}