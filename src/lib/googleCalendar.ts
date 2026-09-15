import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Returns a usable access token for this user's connected Google account,
 * refreshing it first if it has expired. Returns null if the user never
 * connected Google, or the refresh fails (e.g. they revoked access).
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  if (!account?.access_token) return null;

  const isExpired = account.expires_at ? account.expires_at * 1000 < Date.now() : false;
  if (!isExpired) return account.access_token;
  if (!account.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.account.update({
    where: { id: account.id },
    data: { access_token: data.access_token, expires_at: Math.floor(Date.now() / 1000) + data.expires_in },
  });
  return data.access_token;
}

/** Free/busy blocks from the user's primary calendar, for conflict-checking before confirming a time. */
export async function getFreeBusyForUser(userId: string, timeMinUtc: Date, timeMaxUtc: Date) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMinUtc.toISOString(),
      timeMax: timeMaxUtc.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  return res.data.calendars?.primary?.busy ?? [];
}

/** Writes the confirmed meeting onto this user's primary Google Calendar. Best-effort — caller should catch. */
export async function createCalendarEventForUser(
  userId: string,
  opts: { summary: string; startUtc: Date; endUtc: Date }
) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: opts.summary,
      start: { dateTime: opts.startUtc.toISOString() },
      end: { dateTime: opts.endUtc.toISOString() },
    },
  });
  return res.data;
}
