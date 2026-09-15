"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

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
        <Link href="/history" className="text-text-2 hover:text-text px-2 py-1">
          历史记录
        </Link>
        {session?.user ? (
          <button onClick={() => signOut()} className="text-text-2 hover:text-text px-2 py-1">
            {session.user.name} · 退出
          </button>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="bg-accent text-white rounded-md px-3 py-1.5 font-medium"
          >
            使用 Google 登录
          </button>
        )}
      </div>
    </header>
  );
}
