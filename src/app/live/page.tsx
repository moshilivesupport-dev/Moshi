"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Radio, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function LivePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const seller = profile?.role === "vendeur" || profile?.role === "seller" || profile?.role === "admin";
      setIsSeller(seller);
      setLoading(false);
    };
    checkRole();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 pb-20">
      <h1 className="text-2xl font-bold mb-2">Lives</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Découvre les lives en cours ou lance le tien.
      </p>

      <div className="space-y-4">
        {/* Option 1 : Lancer un Live (Acheteur) */}
        <Link
          href="/live/create"
          className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 active:scale-[0.98] transition"
        >
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Lancer un LIVE</p>
            <p className="text-xs text-neutral-400">Partage un moment avec ta communauté</p>
          </div>
        </Link>

        {/* Option 2 : Lancer un Live Shopping (Vendeur uniquement) */}
        {isSeller && (
          <Link
            href="/live/start"
            className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 active:scale-[0.98] transition"
          >
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Lancer un LIVE Shopping</p>
              <p className="text-xs text-neutral-400">Vends tes produits en direct</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}