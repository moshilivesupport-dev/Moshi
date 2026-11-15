"use client";

import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-8 px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/moshi-logo.jpg"
          alt="Moshi"
          width={120}
          height={120}
          className="rounded-3xl shadow-xl"
          priority
        />
        <h1 className="text-3xl font-extrabold tracking-tight">
          moshi
        </h1>
        <p className="text-sm text-moshi-text/60 font-medium">
          Soft Social Commerce · v2.0
        </p>
      </div>

      {/* Boutons de validation du Design System */}
      <div className="flex flex-col gap-3 w-full max-w-xs mt-8">
        <button className="moshi-gradient text-white font-bold py-3.5 rounded-full shadow-lg shadow-purple-200/50 active:scale-95 transition">
          Démarrer l'aventure
        </button>

        <button className="bg-white text-moshi-text font-semibold py-3.5 rounded-full shadow-sm border border-gray-200 active:scale-95 transition">
          Se connecter
        </button>

        <button className="border-2 border-moshi-purple text-moshi-purple font-semibold py-3.5 rounded-full active:scale-95 transition">
          Créer un compte
        </button>
      </div>

      {/* Indicateur visuel de la palette */}
      <div className="flex gap-3 mt-8">
        <div className="w-10 h-10 rounded-full bg-moshi-pink shadow-md" />
        <div className="w-10 h-10 rounded-full bg-moshi-purple shadow-md" />
        <div className="w-10 h-10 rounded-full bg-moshi-blue shadow-md" />
      </div>
    </main>
  );
}