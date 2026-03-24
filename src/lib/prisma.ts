// Re-exports from the canonical Prisma singleton with pg.Pool connection pooling.
// All imports should use this file — do not instantiate PrismaClient elsewhere.
export { prisma } from "../db.js";
