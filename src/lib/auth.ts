import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // calendar.events (write, to create the confirmed meeting) +
          // calendar.readonly (read, for free/busy conflict checks)
          scope: [
            "openid", "email", "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline", // required to get a refresh_token back
          prompt: "consent",      // forces Google to re-issue a refresh_token every login
        },
      },
    }),
  ],
  session: { strategy: "database" },
  // Temporary: NextAuth swallows the real error behind a generic
  // error=OAuthCallback redirect unless debug/logger is on — turning this
  // on so the actual cause (token exchange, adapter write, etc.) shows up
  // in the Netlify function logs instead of vanishing. Safe to remove once
  // login is confirmed working end-to-end.
  debug: true,
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      console.log("[next-auth][debug]", code, metadata);
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) (session.user as { id?: string }).id = user.id;
      return session;
    },
  },
};
