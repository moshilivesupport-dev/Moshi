import Link from "next/link";
import { Radio } from "lucide-react";

export default function LivePage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold mb-2">Lives</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Découvrez les vendeurs en direct
      </p>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
          <Radio className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-neutral-400 mb-6">
          Aucun live en cours pour le moment.
        </p>
        <Link
          href="/create"
          className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-semibold"
        >
          Lancer un live
        </Link>
      </div>
    </div>
  );
}
