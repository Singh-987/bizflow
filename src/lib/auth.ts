import { betterAuth } from "better-auth";
import { Pool } from "pg";
export const auth = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    emailAndPassword: {
        enabled: true,
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        "https://rentello-omega.vercel.app",
        "https://*.vercel.app",
    ],
});