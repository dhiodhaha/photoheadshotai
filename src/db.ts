import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { requireEnv } from "./lib/env.js";

const pool = new Pool({
	connectionString: requireEnv("DATABASE_URL"),
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

// Type cast needed: project has @types/pg@8.18.0 but @prisma/adapter-pg bundles @types/pg@8.11.11
// biome-ignore lint/suspicious/noExplicitAny: version mismatch between @types/pg@8.18.0 and @types/pg@8.11.11
const adapter = new PrismaPg(pool as any);

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
	globalThis.__prisma = prisma;
}
