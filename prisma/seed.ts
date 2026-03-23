import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});
// biome-ignore lint/suspicious/noExplicitAny: pg.Pool type mismatch with PrismaPg constructor
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log("🌱 Seeding database...");

	// 1. Bootstrap codes (invitation-only launch codes, max 5 uses each)
	const bootstrapCodes = ["LAUNCH-001", "LAUNCH-002", "LAUNCH-003"];
	for (const code of bootstrapCodes) {
		await prisma.bootstrapCode.upsert({
			where: { code },
			update: {},
			create: { code, maxRedeems: 5, redeemCount: 0 },
		});
	}
	console.log("✅ Bootstrap codes seeded (5 uses each):");
	for (const code of bootstrapCodes) {
		console.log(`   ${code}`);
	}
}

main()
	.catch((e) => {
		console.error("❌ Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
