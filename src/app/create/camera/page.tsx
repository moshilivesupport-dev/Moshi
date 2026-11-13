"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CameraPage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la home avec un paramètre qui ouvre la caméra
    router.replace("/?openCamera=true");
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}
