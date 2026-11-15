"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

// Données de démo pour tester le design avant de brancher Supabase
const DEMO_VIDEOS = [
  {
    id: "1",
    url: "https://cdn.pixabay.com/video/2023/10/22/185527-877680478_large.mp4",
    caption: "Découvrez notre nouvelle collection ✨💜 #Moshi #Mode",
    likes: 125400,
    comments: 3200,
    author: {
      username: "moshishop",
      name: "Moshi Shop",
      avatar: "https://i.pravatar.cc/150?img=5",
      verified: true,
    },
    product: {
      title: "Sac Élégance Premium",
      price: "29 900 FCFA",
      image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=100&h=100&fit=crop",
    },
  },
  {
    id: "2",
    url: "https://cdn.pixabay.com/video/2020/09/08/49662-458400481_large.mp4",
    caption: "Nouveau drop 🔥 #Streetwear",
    likes: 89000,
    comments: 1500,
    author: {
      username: "urbanstyle",
      name: "Urban Style",
      avatar: "https://i.pravatar.cc/150?img=12",
      verified: false,
    },
    product: null,
  },
];

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

export default function HomeFeed() {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="moshi-feed">
      {DEMO_VIDEOS.map((video) => {
        const isLiked = liked[video.id];
        return (
          <section key={video.id} className="moshi-video relative bg-black">
            {/* Vidéo */}
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={muted}
              playsInline
            />

            {/* Overlay dégradé */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Bouton Mute (haut droite) */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-20 right-4 z-30 moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Actions (droite) */}
            <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  <Image
                    src={video.author.avatar}
                    alt={video.author.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 moshi-gradient rounded-full flex items-center justify-center text-white text-xs font-bold border border-black">
                  +
                </div>
              </div>

              {/* Like */}
              <button
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-1"
              >
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center"
                >
                  <Heart
                    size={24}
                    className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-white"}
                  />
                </motion.div>
                <span className="text-xs font-semibold text-white">
                  {formatNumber(video.likes + (isLiked ? 1 : 0))}
                </span>
              </button>

              {/* Commentaires */}
              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">
                  {formatNumber(video.comments)}
                </span>
              </button>

              {/* Partager */}
              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <Share2 size={22} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">Partager</span>
              </button>

              {/* Musique */}
              <div className="w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center mt-2">
                <Music size={20} className="text-white" />
              </div>
            </div>

            {/* Infos en bas (gauche) */}
            <div className="absolute left-4 right-20 bottom-32 z-20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base">
                  {video.author.name}
                </span>
                {video.author.verified && (
                  <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-white/90 text-sm line-clamp-2">{video.caption}</p>
              <div className="flex items-center gap-2">
                <Music size={12} className="text-white" />
                <p className="text-xs text-white/80">
                  Son original - {video.author.name}
                </p>
              </div>
            </div>

            {/* Carte Produit (si présente) */}
            {video.product && (
              <div className="absolute bottom-4 left-3 right-3 z-30">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-3 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                    <Image
                      src={video.product.image}
                      alt={video.product.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 font-medium">Produit présenté</p>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {video.product.title}
                    </p>
                    <p className="text-sm font-extrabold text-[#9D7BEA]">
                      {video.product.price}
                    </p>
                  </div>
                  <Link href={`/shop/1`}>
                    <button className="moshi-gradient text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                      <ShoppingBag size={14} /> Acheter
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}