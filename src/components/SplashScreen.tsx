"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface SplashScreenProps {
  minDuration?: number;
  onFinish?: () => void;
  audioSrc?: string;
}

export function SplashScreen({
  minDuration = 3000,
  onFinish,
  audioSrc = "/sounds/moshi-moshi.mp3",
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    setTimeout(() => onFinish?.(), 500);
  }, [onFinish]);

  useEffect(() => {
    let cancelled = false;

    const playGreeting = async () => {
      try {
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        audio.volume = 0.9;
        await audio.play();
        return;
      } catch {
        /* file missing or autoplay blocked */
      }

      if (cancelled) return;

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance("Moshi Moshi");
        utter.lang = "en-US";
        utter.rate = 1.15;
        utter.pitch = 1.6;
        utter.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /child|kid|girl|female|samantha|karen/i.test(v.name)) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) utter.voice = preferred;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    };

    const t = setTimeout(playGreeting, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
      audioRef.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [audioSrc]);

  useEffect(() => {
    const t = setTimeout(finish, minDuration);
    return () => clearTimeout(t);
  }, [minDuration, finish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f5f0e8] overflow-hidden cursor-pointer"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onClick={finish}
        >
          {/* Soft ambient light */}
          <motion.div
            className="absolute w-[520px] h-[520px] rounded-full bg-coral/10 blur-3xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 1 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full bg-champagne/20 blur-2xl"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.8 }}
            transition={{ duration: 1.1, delay: 0.1 }}
          />

          {/* Official Moshi logo – formation animation */}
          <motion.div
            className="relative z-10 w-[min(88vw,420px)]"
            initial={{ scale: 0.55, opacity: 0, filter: "blur(12px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 16,
              mass: 1.1,
              delay: 0.12,
            }}
          >
            <motion.div
              initial={{ rotate: -8 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/moshi-logo.jpg"
                alt="Moshi – Live Shopping Platform"
                className="w-full h-auto drop-shadow-xl select-none"
                draggable={false}
              />
            </motion.div>

            {/* Shine sweep over logo */}
            <motion.div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12"
                initial={{ left: "-40%" }}
                animate={{ left: "120%" }}
                transition={{ delay: 1.0, duration: 0.85, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>

          {/* Gold pulse under logo */}
          <motion.div
            className="absolute w-40 h-40 rounded-full border border-champagne/40"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 1.1 }}
          />

          <motion.p
            className="absolute bottom-10 text-[11px] text-red-900/40 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            Touchez pour continuer
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
