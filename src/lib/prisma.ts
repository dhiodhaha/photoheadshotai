import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "generated/prisma/client";
import { requireEnv } from "#/lib/env";

const adapter = new PrismaPg({
	connectionString: requireEnv("DATABASE_URL"),
});

export const prisma = new PrismaClient({ adapter });
