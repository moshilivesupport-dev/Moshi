"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Coins, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinPack {
  id: string;
  coins: number;
  price_fcfa: number;
  bonus: number;
  is_popular: boolean;
}

export default function WalletPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
      setBalance(wallet?.balance || 0);

      const { data: packsData } = await supabase.from("coin_packs").select("*").order("price_fcfa", { ascending: true });
      setPacks(packsData || []);

      setLoading(false);
    };
    loadData();
  }, [supabase, router]);

  const handleBuy = async (pack: CoinPack) => {
    if (!userId) return;
    setBuying(pack.id);

    // Simulation d'achat (à remplacer par Cinetpay plus tard)
    try {
      const totalCoins = pack.coins + pack.bonus;
      const newBalance = balance + totalCoins;
      const { error } = await supabase.from("wallets").update({ balance: newBalance }).eq("user_id", userId);
      if (error) throw error;
      setBalance(newBalance);
      alert(`Félicitations ! Tu as reçu ${totalCoins.toLocaleString()} coins.`);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-moshi-purple animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      
      <header className="px-4 py-4 flex items-center bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold ml-2">Mon Portefeuille</h1>
      </header>

      {/* SOLDE */}
      <div className="p-6">
        <div className="moshi-gradient rounded-3xl p-6 text-white shadow-xl shadow-purple-200/50 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <p className="text-white/80 text-sm font-semibold mb-1">Ton solde</p>
          <div className="flex items-center gap-2">
            <Coins className="w-8 h-8 text-yellow-300" />
            <span className="text-4xl font-extrabold">{balance.toLocaleString()}</span>
            <span className="text-white/80 text-sm font-semibold mt-2">coins</span>
          </div>
        </div>
      </div>

      {/* PACKS (Style Poppo) */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-moshi-text">Recharger mes coins</h2>
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <TrendingUp size={12} /> Plus tu achètes, moins c'est cher
          </div>
        </div>
        
        <div className="space-y-3">
          {packs.map((pack) => {
            const totalCoins = pack.coins + pack.bonus;
            const pricePerCoin = pack.price_fcfa / totalCoins;
            
            return (
              <div 
                key={pack.id} 
                className={cn(
                  "relative bg-white rounded-2xl p-4 shadow-sm border-2 flex items-center justify-between",
                  pack.is_popular ? "border-moshi-purple" : "border-transparent"
                )}
              >
                {pack.is_popular && (
                  <span className="absolute -top-2.5 left-4 bg-moshi-purple text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> MEILLEUR CHOIX
                  </span>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                    pack.is_popular ? "moshi-gradient text-white" : "bg-yellow-50 text-yellow-600"
                  )}>
                    <Coins size={28} />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-moshi-text">{totalCoins.toLocaleString()} <span className="text-xs font-semibold text-gray-400">coins</span></p>
                    {pack.bonus > 0 && (
                      <p className="text-[10px] font-bold text-green-500">+{pack.bonus.toLocaleString()} offerts</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{pricePerCoin.toFixed(2)} FCFA / coin</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleBuy(pack)}
                  disabled={buying === pack.id}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-1",
                    pack.is_popular 
                      ? "moshi-gradient text-white shadow-md" 
                      : "bg-gray-100 text-moshi-text"
                  )}
                >
                  {buying === pack.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `${pack.price_fcfa.toLocaleString()} F`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-8 px-8">
        Le paiement réel sera bientôt disponible via Cinetpay. En attendant, les achats sont simulés pour tester l'expérience.
      </p>

    </div>
  );
}