import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Event, Participant } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    where: {
      status: "confirmed",
      OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
    },
    orderBy: { confirmedStartUtc: "desc" },
    include: { participants: true },
  });

  return NextResponse.json(
    events.map((e: Event & { participants: Participant[] }) => ({
      id: e.id,
      title: e.title,
      confirmedStartUtc: e.confirmedStartUtc,
      confirmedEndUtc: e.confirmedEndUtc,
      participantCount: e.participants.length,
    }))
  );
}
