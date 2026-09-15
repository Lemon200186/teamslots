import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readGuestId } from "@/lib/guest";
import type { Participant } from "@prisma/client";

// Public GET — anyone with the link can view the event and its aggregate
// availability. We separately identify "my" participant record (by session
// user id, or by the anonymous guest cookie) so the client can prefill the
// grid with what this visitor already submitted, and exclude self from the
// "others" list.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const guestId = readGuestId();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { participants: true, owner: { select: { name: true } } },
  });
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });

  const mine = event.participants.find(
    (p: Participant) => (userId && p.userId === userId) || (!userId && guestId && p.guestId === guestId)
  );

  return NextResponse.json({
    id: event.id,
    title: event.title,
    ownerName: event.owner.name,
    isOwner: !!userId && userId === event.ownerId,
    startDate: event.startDate,
    dayCount: event.dayCount,
    slotMinutes: event.slotMinutes,
    status: event.status,
    confirmedStartUtc: event.confirmedStartUtc,
    confirmedEndUtc: event.confirmedEndUtc,
    myParticipantId: mine?.id ?? null,
    mySlotsUtc: mine?.slotsUtc ?? [],
    myName: mine?.name ?? session?.user?.name ?? "",
    myEmail: mine?.email ?? session?.user?.email ?? "",
    participants: event.participants
      .filter((p: Participant) => p.id !== mine?.id)
      .map((p: Participant) => ({ id: p.id, name: p.name, slotsUtc: p.slotsUtc })),
  });
}
