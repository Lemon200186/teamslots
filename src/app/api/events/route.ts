import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mondayOfThisWeek } from "@/lib/time";

// Creating an event requires an account — this is the one place TeamSlots
// asks for login, per the product decision to keep participation frictionless
// but ownership (and later, history) tied to a real account.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "未命名会议").slice(0, 120);
  const allowedDurations = [15, 30, 45, 60, 90, 120];
  const durationMinutes = allowedDurations.includes(Number(body.durationMinutes))
    ? Number(body.durationMinutes)
    : 30;

  const event = await prisma.event.create({
    data: {
      title,
      ownerId: userId,
      startDate: body.startDate || mondayOfThisWeek(),
      dayCount: 7,
      slotMinutes: 15,
      durationMinutes,
    },
  });

  return NextResponse.json({ id: event.id });
}
