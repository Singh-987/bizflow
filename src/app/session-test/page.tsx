import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function SessionTest(){
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    return(
        <main>
            <h1>Session Test</h1>
            {session ? (
                <pre>{JSON.stringify(session, null, 2)}</pre>
            ):(
                <p>No active session</p>
            )
        }
        </main>
    );
}