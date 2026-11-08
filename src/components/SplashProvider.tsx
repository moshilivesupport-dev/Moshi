"use client";

import { useState, useEffect } from "react";
import { SplashScreen } from "./SplashScreen";

const SESSION_KEY = "moshi_splash_seen";

/**
 * Shows the animated splash + "Moshi Moshi" greeting once per browser session.
 * Set NEXT_PUBLIC_SPLASH_ALWAYS=1 to show every load (dev).
 */
export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const always = process.env.NEXT_PUBLIC_SPLASH_ALWAYS === "1";
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (always || !seen) {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
    setReady(true);
  }, []);

  const handleFinish = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!ready) {
    // Avoid flash of main UI before we know if splash is needed
    return (
      <div className="fixed inset-0 z-[9999] bg-onyx" aria-hidden />
    );
  }

  return (
    <>
      {show && (
        <SplashScreen
          minDuration={3000}
          audioSrc="/sounds/moshi-moshi.mp3"
          onFinish={handleFinish}
        />
      )}
      {children}
    </>
  );
}
