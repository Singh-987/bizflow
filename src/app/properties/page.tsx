import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PropertiesClient from "../api/properties/PropertiesClient";
import AppShell from "@/components/layout/AppShell";

export default async function Properties(){
    const session = await auth.api.getSession({
        headers : await headers(),
    });

    if(!session){
        redirect("/login");
    }

    return (
        <AppShell>
        <PropertiesClient/>
        </AppShell>
);

}