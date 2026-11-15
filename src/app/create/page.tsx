import Link from "next/link";

export default function CreatePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-moshi-bg p-6">
      <h1 className="text-2xl font-bold mb-2">Créer une vidéo</h1>
      <p className="text-gray-500 mb-6 text-center">Cette page servira à publier tes vidéos. On la codera à la Phase 4.</p>
      <Link href="/"><button className="moshi-gradient text-white font-bold px-6 py-3 rounded-full">Retour à l'accueil</button></Link>
    </div>
  );
}