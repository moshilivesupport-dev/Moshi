import Link from "next/link";

export default function MessagesPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-moshi-bg p-6">
      <h1 className="text-2xl font-bold mb-2">Messagerie</h1>
      <p className="text-gray-500 mb-6 text-center">Tes conversations privées apparaîtront ici. On la codera à la Phase 6.</p>
      <Link href="/"><button className="moshi-gradient text-white font-bold px-6 py-3 rounded-full">Retour à l'accueil</button></Link>
    </div>
  );
}