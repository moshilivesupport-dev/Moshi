"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, X } from "lucide-react";
import CreatorResult from "@/components/search/CreatorResult";
import ProductResult from "@/components/search/ProductResult";
import VideoResult from "@/components/search/VideoResult";

type SearchTab = "creators" | "products" | "videos";

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("creators");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);

      try {
        let data: any[] = [];

        if (activeTab === "creators") {
          const { data: creators } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, bio")
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(20);
          data = creators || [];
        } else if (activeTab === "products") {
          const { data: products } = await supabase
            .from("products")
            .select("id, name, price, image_url, seller_id, profiles:seller_id(username, avatar_url)")
            .ilike("name", `%${query}%`)
            .eq("status", "active")
            .limit(20);
          data = products || [];
        } else if (activeTab === "videos") {
          const { data: videos } = await supabase
            .from("videos")
            .select(`
              id, url, caption, view_count, like_count, user_id,
              profiles:user_id (username, avatar_url)
            `)
            .ilike("caption", `%${query}%`)
            .eq("status", "published")
            .order("view_count", { ascending: false })
            .limit(20);
          data = videos || [];
        }

        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [query, activeTab, supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header avec recherche */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des créateurs, produits, vidéos..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-4 mt-3 border-b border-neutral-800">
          {(["creators", "products", "videos"] as SearchTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-semibold transition-colors relative ${
                activeTab === tab ? "text-white" : "text-neutral-500"
              }`}
            >
              {tab === "creators" ? "Créateurs" : tab === "products" ? "Produits" : "Vidéos"}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Résultats */}
      <main className="px-4 py-4">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-16 h-16 text-neutral-700 mb-4" />
            <p className="text-neutral-400 text-sm">
              Recherchez des créateurs, produits ou vidéos
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-neutral-400 text-sm">Aucun résultat pour "{query}"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTab === "creators" &&
              results.map((creator) => (
                <CreatorResult key={creator.id} creator={creator} />
              ))}
            {activeTab === "products" &&
              results.map((product) => (
                <ProductResult key={product.id} product={product} />
              ))}
            {activeTab === "videos" &&
              results.map((video) => (
                <VideoResult key={video.id} video={video} />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
