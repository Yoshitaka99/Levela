"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session } from "@supabase/supabase-js";

export default function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [session, setSession] = useState<Session | null>(null);

  const navItems = [
    { name: "商品", href: "/items", icon: "📦" },
    { name: "お気に入り", href: "/favorites", icon: "💖" },
    { name: "メッセージ", href: "/messages", icon: "💬", badge: unreadCount },
    { name: session ? "マイページ" : "ログイン", href: session ? "/profile" : "/auth/login", icon: "👤" },
  ];

  const fetchUnreadCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUnreadCount(session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        if (session) {
          fetchUnreadCount(session.user.id);
        } else {
          setUnreadCount(0);
        }
      }
    );

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // Real-time unread count updates
  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;

    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { receiver_id: string; read: boolean };
          if (msg.receiver_id === userId && !msg.read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          // Re-fetch on any update to stay accurate
          fetchUnreadCount(userId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Hide on auth pages and individual chat pages
  if (pathname.startsWith("/auth")) return null;
  if (pathname.startsWith("/seminar-dashboard")) return null;
  if (pathname.startsWith("/team-sales-dashboard")) return null;
  if (pathname.startsWith("/team")) return null;
  if (/^\/messages\/.+/.test(pathname)) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/10 pb-safe z-50">
      <div className="flex justify-around items-center h-20 px-2 relative">
        {/* Left items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/items" && pathname === "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center w-16 group"
            >
              <span
                className={`text-2xl mb-1 transition-transform ${
                  isActive
                    ? "scale-110 opacity-100"
                    : "opacity-70 group-hover:opacity-100"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Center floating action button */}
        <div className="relative -top-6 flex flex-col items-center justify-center">
          <Link
            href="/sell"
            className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40 border-4 border-[#0f0f0f] text-white hover:scale-105 transition-transform"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Link>
        </div>

        {/* Right items */}
        {navItems.slice(2, 4).map((item) => {
          const isActive =
            pathname.startsWith(item.href) && item.href !== "/";
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center w-16 relative group"
            >
              <span
                className={`text-2xl mb-1 transition-transform ${
                  isActive
                    ? "scale-110 opacity-100"
                    : "opacity-70 group-hover:opacity-100"
                }`}
              >
                {item.icon}
              </span>

              {/* Unread badge */}
              {(item.badge as number) > 0 && (
                <span className="absolute top-0 right-2 min-w-[20px] h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0f0f0f] animate-pulse px-1">
                  {(item.badge as number) > 99 ? "99+" : item.badge}
                </span>
              )}

              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
