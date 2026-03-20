import { describe, expect, it, vi } from "vitest";
import { prisma } from "#/lib/prisma";
import { generationService } from "./generation.service";

// Mocking Prisma
vi.mock("#/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
		photo: {
			findUnique: vi.fn(),
		},
		generationJob: {
			create: vi.fn(),
		},
		creditTransaction: {
			create: vi.fn(),
		},
		$transaction: vi.fn((cb) => cb),
	},
}));

describe("GenerationService", () => {
	it("should throw an error if user has insufficient credits", async () => {
		// Mock user with 5 credits
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user-1",
			currentCredits: 5,
		});

		await expect(
			generationService.startGeneration("user-1", "photo-1", "cinematic"),
		).rejects.toThrow("Insufficient credits. Please top up.");
	});

	it("should throw an error if photo does not exist", async () => {
		// Mock user with enough credits
		(prisma.user.findUnique as any).mockResolvedValue({
			id: "user-1",
			currentCredits: 100,
		});
		// Mock photo as null
		(prisma.photo.findUnique as any).mockResolvedValue(null);

		await expect(
			generationService.startGeneration("user-1", "photo-1", "cinematic"),
		).rejects.toThrow("Photo not found or access denied.");
	});
});
