import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE = "teamslots_guest_id";

/** Reads the guest identity cookie if present. Does NOT create one — use in read-only routes (GET). */
export function readGuestId(): string | undefined {
  return cookies().get(COOKIE)?.value;
}

/** Reads the guest identity cookie, creating one if this is the visitor's first time. Use in write routes (POST). */
export function getOrCreateGuestId(): string {
  const store = cookies();
  let id = store.get(COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    store.set(COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return id;
}
