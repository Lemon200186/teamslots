import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't spawn a new
// PrismaClient (and a new connection pool) on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Temporary: surfaces the actual Prisma-level error/query timing —
    // NextAuth's own error handling was swallowing whatever goes wrong
    // during the OAuth callback's adapter calls, so this bypasses that
    // and logs straight from the Prisma engine. Safe to trim back to
    // just ["error"] once the root cause is found.
    log: ["error", "warn", "query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
