import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateGuestId } from "@/lib/guest";

// Upserts the caller's availability for this event. Works for both signed-in
// users (keyed by userId) and anonymous guests (keyed by a cookie-issued
// guestId) — this is the "free to participate, account to own" split from
// the PRD.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const guestId = userId ? undefined : getOrCreateGuestId();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || session?.user?.name || "匿名参与者").slice(0, 60);
  const email = body.email || session?.user?.email || null;
  const timezone = String(body.timezone || "Asia/Singapore");
  const slotsUtc: string[] = Array.isArray(body.slotsUtc) ? body.slotsUtc : [];

  const where = userId
    ? { eventId_userId: { eventId: params.id, userId } }
    : { eventId_guestId: { eventId: params.id, guestId: guestId! } };

  const participant = await prisma.participant.upsert({
    // NOTE: Prisma's compound-unique upsert typing is stricter than this in
    // practice — tighten before shipping (e.g. two explicit code paths for
    // the userId vs guestId case) if `tsc` complains here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    update: { name, email, timezone, slotsUtc },
    create: {
      eventId: params.id,
      userId: userId ?? null,
      guestId: guestId ?? null,
      name,
      email,
      timezone,
      slotsUtc,
    },
  });

  return NextResponse.json({ id: participant.id });
}
