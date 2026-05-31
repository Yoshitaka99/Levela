"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PWAHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/seminar-dashboard")) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered!", reg.scope))
        .catch((err) => console.log("Service Worker registration failed:", err));
    }
  }, [pathname]);

  return null;
}
