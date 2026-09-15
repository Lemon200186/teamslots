import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEventForUser } from "@/lib/googleCalendar";
import { sendConfirmationEmail, renderConfirmationEmail } from "@/lib/email";
import type { Participant } from "@prisma/client";

// Owner-only. Locks in the final time, then best-effort pushes it to every
// connected participant's Google Calendar and emails everyone who left an
// address. Both integrations are wrapped per-participant so one failure
// (revoked Google access, bad email) never blocks the others.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { participants: true },
  });
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (event.ownerId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const startUtc = new Date(body.startUtc);
  const endUtc = new Date(body.endUtc);
  if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
    return NextResponse.json({ error: "invalid time range" }, { status: 400 });
  }

  await prisma.event.update({
    where: { id: event.id },
    data: { status: "confirmed", confirmedStartUtc: startUtc, confirmedEndUtc: endUtc },
  });

  const results = await Promise.allSettled(
    event.participants.map(async (p: Participant) => {
      if (p.userId) {
        await createCalendarEventForUser(p.userId, { summary: event.title, startUtc, endUtc });
      }
      await sendConfirmationEmail({
        to: p.email,
        subject: `[TeamSlots] "${event.title}" 时间已确定`,
        html: renderConfirmationEmail(event.title, startUtc, endUtc, p.timezone),
      });
    })
  );
  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures) console.error(`confirm: ${failures} participant notification(s) failed`);

  return NextResponse.json({ ok: true });
}
