import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prisma } from "#/lib/prisma";
import { getServerSession } from "#/modules/auth";

const deductSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
});

export const Route = createFileRoute("/api/credits/deduct")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getServerSession(request);
        if (!session || !session.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = await request.json();
          const { amount } = deductSchema.parse(body);

          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
          });

          if (!user || user.currentCredits < amount) {
            return Response.json(
              { error: "Insufficient credits" },
              { status: 402 },
            );
          }

          // Atomically deduct and log
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { currentCredits: { decrement: amount } },
            }),
            prisma.creditTransaction.create({
              data: {
                userId: user.id,
                amount: -amount,
                transactionType: "generation_deduction",
                // description: reason || "Manual deduction" // If we added description to schema
              },
            }),
          ]);

          return Response.json({
            message: "Credits deducted successfully",
            remainingCredits: user.currentCredits - amount,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Internal server error";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
