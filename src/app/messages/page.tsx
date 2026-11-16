"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Search, Edit3, MessageCircle } from "lucide-react";
import StoriesBar from "@/components/home/StoriesBar";

// Données de démo pour les conversations (on les connectera à Supabase plus tard)
const DEMO_CONVERSATIONS = [
  { id: "1", name: "Maya", avatar: "https://i.pravatar.cc/150?img=1", lastMessage: "Super live hier ! 🔥", time: "2 min", unread: 2 },
  { id: "2", name: "Kevin", avatar: "https://i.pravatar.cc/150?img=12", lastMessage: "Merci pour ta commande 💜", time: "1h", unread: 0 },
  { id: "3", name: "Sarah", avatar: "https://i.pravatar.cc/150?img=5", lastMessage: "Tu as vu le nouveau drop ?", time: "3h", unread: 1 },
  { id: "4", name: "Djenna", avatar: "https://i.pravatar.cc/150?img=9", lastMessage: "À demain pour le live !", time: "Hier", unread: 0 },
];

export default function MessagesPage() {
  const [search, setSearch] = useState("");

  const filtered = DEMO_CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24">
      
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1"><ArrowLeft className="w-6 h-6" /></Link>
          <h1 className="text-lg font-bold flex-1">Messagerie</h1>
          <button className="p-2"><Edit3 className="w-5 h-5 text-moshi-purple" /></button>
        </div>
        
        {/* BARRE DE RECHERCHE */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
            />
          </div>
        </div>
      </header>

      {/* BARRE DE STORIES DANS LA MESSAGERIE */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        {/* On force le texte en noir pour que ça soit visible sur fond blanc */}
        <div className="[&_span]:!text-moshi-text [&_div.border-dashed]:!border-gray-300">
          <StoriesBar />
        </div>
      </div>

      {/* LISTE DES CONVERSATIONS */}
      <div className="p-4 max-w-md mx-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <MessageCircle className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Aucune conversation trouvée.</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <Link key={conv.id} href={`/messages/${conv.id}`} className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm active:scale-95 transition">
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                  <Image src={conv.avatar} alt={conv.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                </div>
                {conv.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF4B72] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                    {conv.unread}
                  </div>
                )}
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-bold text-moshi-text truncate">{conv.name}</p>
                  <p className="text-[10px] text-gray-400 shrink-0 ml-2">{conv.time}</p>
                </div>
                <p className={`text-sm truncate ${conv.unread > 0 ? "text-moshi-text font-semibold" : "text-gray-500"}`}>
                  {conv.lastMessage}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}