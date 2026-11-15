"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, ShoppingBag, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// Données de démo calquées EXACTEMENT sur ta maquette
const DEMO_VIDEOS = [
  {
    id: "1",
    // J'utilise une vidéo de test très fiable
    url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-smiling-at-the-camera-1230-large.mp4",
    caption: "Découvrez notre nouvelle collection ✨💜\n#Moshi #LiveShopping #Mode",
    like_count: 125400,
    comment_count: 3200,
    share_count: 12100,
    user_id: "demo-1",
    profiles: {
      username: "moshishop",
      full_name: "Moshi Shop",
      avatar_url: "https://i.pravatar.cc/150?img=5",
    },
    product: {
      title: "Sac Élégance Premium",
      price: "29 900 FCFA",
      // L'image exacte du sac rose de ta maquette
      image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=150&h=150&fit=crop&q=80",
    },
  },
];

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

export default function HomeFeed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos] = useState<any[]>(DEMO_VIDEOS);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  return (
    <div ref={containerRef} className="moshi-feed">
      {videos.map((video) => {
        const isLiked = liked[video.id];
        const author = video.profiles;
        const authorName = author?.full_name || author?.username || "user";

        return (
          <section key={video.id} className="moshi-video relative bg-black">
            
            {/* 1. LA VIDÉO */}
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={muted}
              playsInline
            />

            {/* Overlay dégradé pour lire le texte */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* 2. BOUTON MUTE */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute bottom-[210px] right-3 z-30 w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg"
            >
              {muted ? <VolumeX size={20} className="text-gray-900" /> : <Volume2 size={20} className="text-gray-900" />}
            </button>

            {/* 3. ACTIONS À DROITE */}
            <div className="absolute right-3 bottom-[280px] z-20 flex flex-col items-center gap-5">
              
              {/* Avatar avec le bouton + */}
              <div className="relative mb-2">
                <div className="w-[52px] h-[52px] rounded-full overflow-hidden border-[3px] border-white bg-neutral-800 shadow-md">
                  <Image src={author.avatar_url} alt={authorName} width={52} height={52} className="w-full h-full object-cover" unoptimized />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[22px] h-[22px] bg-[#FF4B72] rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-black">
                  +
                </div>
              </div>

              {/* Like */}
              <button onClick={() => setLiked(p => ({...p, [video.id]: !p[video.id]}))} className="flex flex-col items-center gap-1.5">
                <div className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <Heart size={24} className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-gray-900"} />
                </div>
                <span className="text-[13px] font-semibold text-white drop-shadow-md">
                  {formatNumber(video.like_count + (isLiked ? 1 : 0))}
                </span>
              </button>

              {/* Commentaires */}
              <button className="flex flex-col items-center gap-1.5">
                <div className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <MessageCircle size={24} className="text-gray-900" />
                </div>
                <span className="text-[13px] font-semibold text-white drop-shadow-md">
                  {formatNumber(video.comment_count)}
                </span>
              </button>

              {/* Partager */}
              <button className="flex flex-col items-center gap-1.5">
                <div className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <Share2 size={24} className="text-gray-900" />
                </div>
                <span className="text-[13px] font-semibold text-white drop-shadow-md">
                  {formatNumber(video.share_count)}
                </span>
              </button>
            </div>

            {/* 4. INFOS EN BAS À GAUCHE */}
            <div className="absolute left-4 right-24 bottom-[220px] z-20 space-y-3">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${video.user_id}`} className="text-white font-bold text-[18px] drop-shadow-md">
                  {authorName}
                </Link>
                <span className="w-[18px] h-[18px] bg-blue-500 rounded-full flex items-center justify-center text-[11px] text-white font-bold">✓</span>
                
                {/* Bouton Suivre */}
                <button className="ml-1 px-4 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm text-white text-[13px] font-semibold">
                  Suivre
                </button>
              </div>
              
              <p className="text-white text-[15px] font-medium leading-snug drop-shadow-md whitespace-pre-line">
                {video.caption}
              </p>
            </div>

            {/* 5. CARTE PRODUIT */}
            {video.product && (
              <div className="absolute bottom-[100px] left-3 right-3 z-30">
                <div className="bg-white/95 backdrop-blur-md rounded-[24px] p-2.5 flex items-center gap-3 shadow-xl">
                  <div className="w-[60px] h-[60px] rounded-2xl bg-gray-100 flex-shrink-0 overflow-hidden">
                    <Image src={video.product.image} alt="Produit" width={60} height={60} className="w-full h-full object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate">{video.product.title}</p>
                    <p className="text-[16px] font-extrabold text-[#9D7BEA]">{video.product.price}</p>
                  </div>
                  
                  {/* Bouton Acheter */}
                  <button className="moshi-gradient text-white px-5 py-2.5 rounded-full text-[15px] font-bold flex items-center gap-2 shadow-md">
                    <ShoppingBag size={18} /> Acheter
                  </button>
                  <ChevronRight size={22} className="text-gray-400 mr-1" />
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}