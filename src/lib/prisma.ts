import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't spawn a new
// PrismaClient (and a new connection pool) on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Keep error-level logging in production (cheap, no sensitive query
    // params in it) — the earlier "warn"+"query" levels were a temporary
    // diagnostic and got removed once the actual bug was found, since query
    // logs include raw parameter values (tokens, emails).
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
