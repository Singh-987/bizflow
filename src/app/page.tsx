import DashboardContent from "@/components/dashboard/DashboardContext";
import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export default async function Properties(){
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if(!session){
    redirect("/login");
  }

  return(
   <AppShell>
    <DashboardContent/>
   </AppShell>
  );
}