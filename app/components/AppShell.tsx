"use client";

import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "./BottomNav";
import { Navbar } from "./Navbar";
import { PWAHandler } from "./PwaHandler";

const immersiveRoutes = ["/chatbot", "/chatbot-admin", "/sale/chatbot"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersive = immersiveRoutes.some((route) =>
    pathname.startsWith(route)
  );

  return (
    <TooltipProvider>
      <PWAHandler />
      {isImmersive ? (
        children
      ) : (
        <>
          <div className="pb-24 md:pb-0">
            <Navbar />
            {children}
          </div>
          <BottomNav />
        </>
      )}
    </TooltipProvider>
  );
}
