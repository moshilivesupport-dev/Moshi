"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Search as SearchIcon, X, User, Play, ShoppingBag, Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { searchAll, type SearchResults } from "@/lib/search";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "top" | "profiles" | "videos" | "products";

const TABS: { key: Tab; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "profiles", label: "Comptes" },
  { key: "videos", label: "Vidéos" },
  { key: "products", label: "Produits" },
];

export default function SearchPage() {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ profiles: [], videos: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("top");
  const [searched, setSearched] = useState(false);

  // Debounce manuel : lancer la recherche 500ms après la dernière frappe
  useEffect(() => {
    if (!query.trim()) {
      setResults({ profiles: [], videos: [], products: [] });
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await searchAll(supabase, query);
      setResults(data);
      setSearched(true);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, supabase]);

  const totalResults =
    results.profiles.length + results.videos.length + results.products.length;

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header avec barre de recherche */}
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-3 py-3 border-b border-neutral-800">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex items-center bg-neutral-900 rounded-full px-4 py-2.5">
          <SearchIcon className="w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            autoFocus
            className="flex-1 bg-transparent text-white text-sm ml-2 outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          )}
        </div>
      </header>

      {/* Onglets */}
      {searched && (
        <div className="flex gap-4 px-4 py-3 border-b border-neutral-800 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const count =
              tab.key === "top" ? totalResults
              : tab.key === "profiles" ? results.profiles.length
              : tab.key === "videos" ? results.videos.length
              : results.products.length;
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "text-sm font-semibold whitespace-nowrap transition-colors relative pb-1",
                  activeTab === tab.key ? "text-white" : "text-neutral-500"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenu */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : !searched ? (
          <div className="text-center py-20">
            <SearchIcon className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              Cherche des créateurs, des vidéos ou des produits
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 text-sm">
              Aucun résultat pour "{query}"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section Top / Profils */}
            {(activeTab === "top" || activeTab === "profiles") && results.profiles.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Comptes
                </h2>
                <div className="space-y-2">
                  {results.profiles.slice(0, activeTab === "top" ? 3 : 20).map((profile) => (
                    <Link
                      key={profile.id}
                      href={`/profile/${profile.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-900 active:bg-neutral-800"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                            {(profile.full_name || profile.username || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {profile.full_name || profile.username}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          @{profile.username}
                        </p>
                      </div>
                      {profile.role === "vendeur" && (
                        <span className="text-[10px] font-bold bg-purple-600 px-2 py-0.5 rounded">
                          VENDEUR
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Section Vidéos */}
            {(activeTab === "top" || activeTab === "videos") && results.videos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Vidéos
                </h2>
                <div className="grid grid-cols-3 gap-1">
                  {results.videos.slice(0, activeTab === "top" ? 6 : 30).map((video) => (
                    <Link
                      key={video.id}
                      href={`/videos/${video.id}`}
                      className="relative aspect-[9/16] bg-neutral-900 rounded overflow-hidden"
                    >
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={video.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] font-semibold drop-shadow-md">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {formatNumber(video.view_count || 0)}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Section Produits */}
            {(activeTab === "top" || activeTab === "products") && results.products.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Produits
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {results.products.slice(0, activeTab === "top" ? 4 : 20).map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/${product.id}`}
                      className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800"
                    >
                      <div className="aspect-square bg-neutral-800">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-neutral-700" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                        <p className="text-sm font-bold text-green-400 mt-1">
                          {Number(product.price).toFixed(2)} €
                        </p>
                        {product.profiles && (
                          <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                            par @{product.profiles.username}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}