import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL!,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log("🌱 Seeding database...");

	// 1. Create a Test User
	const user = await prisma.user.upsert({
		where: { email: "test@example.com" },
		update: {},
		create: {
			email: "test@example.com",
			name: "Test User",
			currentCredits: 500,
		},
	});

	console.log(
		`✅ User seeded: ${user.email} (Credits: ${user.currentCredits})`,
	);

	// 2. Add Sample Credit Transactions
	const transactions = await prisma.creditTransaction.createMany({
		data: [
			{
				userId: user.id,
				amount: 500,
				transactionType: "PURCHASE",
			},
			{
				userId: user.id,
				amount: -10,
				transactionType: "GENERATION_DEDUCTION",
			},
		],
	});

	console.log(`✅ Seeded ${transactions.count} transactions.`);
}

main()
	.catch((e) => {
		console.error("❌ Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
