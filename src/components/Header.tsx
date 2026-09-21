"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";

export function Header() {
  const { data: session } = useSession();
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-white/85 backdrop-blur flex items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] text-text">
        <span className="relative w-5 h-5 inline-block">
          <span className="absolute w-3.5 h-3.5 rounded-full bg-accent left-0 top-0" />
          <span
            className="absolute w-3.5 h-3.5 rounded-full bg-[#FF6B5B] right-0 bottom-0"
            style={{ mixBlendMode: "multiply" }}
          />
        </span>
        TeamSlots
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1 text-xs border border-border rounded-md px-1.5 py-1">
          <button
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "font-semibold text-text px-1" : "text-text-3 px-1 hover:text-text-2"}
          >
            中
          </button>
          <span className="text-border-strong">/</span>
          <button
            onClick={() => setLocale("en")}
            className={locale === "en" ? "font-semibold text-text px-1" : "text-text-3 px-1 hover:text-text-2"}
          >
            EN
          </button>
        </div>
        <Link href="/history" className="text-text-2 hover:text-text px-2 py-1">
          {t("header.history")}
        </Link>
        {session?.user ? (
          <button onClick={() => signOut()} className="text-text-2 hover:text-text px-2 py-1">
            {session.user.name} · {t("header.signout")}
          </button>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="bg-accent text-white rounded-md px-3 py-1.5 font-medium"
          >
            {t("header.signin")}
          </button>
        )}
      </div>
    </header>
  );
}
