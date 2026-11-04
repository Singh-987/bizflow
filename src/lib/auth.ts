import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        "https://rentello-omega.vercel.app",
        "https://rentello-gfh4l9mws-singh-987s-projects.vercel.app",
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
});