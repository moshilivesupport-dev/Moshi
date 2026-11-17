
"use client";

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type { MouseEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

import { createClient } from "@/lib/supabase/client";

import {
  Eye,
  Heart,
  ShoppingBag,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  UserPlus,
  Gift,
  MoreHorizontal,
  Send,
  Smile,
  Crown,
  Coins,
  Music,
  Share2,
  X,
  Package,
  BarChart3,
  ClipboardList,
  Settings,
  Users,
  Copy,
  Check,
} from "lucide-react";

import { cn, getFlag } from "@/lib/utils";
import GiftPanel from "@/components/live/GiftPanel";
import GiftAnimation from "@/components/live/GiftAnimation";
import Soundboard from "@/components/live/Soundboard";

import type { LiveMediaControls } from "@/components/live/LiveKitRoom";

const LiveKitRoomComponent = dynamic(
  () => import("@/components/live/LiveKitRoom"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    ),
  }
);

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  colorStart: string;
  colorEnd: string;
}

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  avatar: string | null;
  isGift?: boolean;
  isJoin?: boolean;
}

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
}

interface GiftAnimationItem {
  id: string;
  icon: string;
  name: string;
  senderName: string;
  quantity: number;
}

export default function LiveRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const supabase = useMemo(() => createClient(), []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const giftChannelRef = useRef<RealtimeChannel | null>(null);

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveErrorMessage, setLiveErrorMessage] = useState("");

  const [isHost, setIsHost] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [userName, setUserName] = useState("Viewer");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);

  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const [giftQueue, setGiftQueue] = useState<GiftAnimationItem[]>([]);
  const [mediaControls, setMediaControls] =
    useState<LiveMediaControls | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const activeGiftAnimation = giftQueue[0] ?? null;

  const finishGiftAnimation = useCallback(() => {
    setGiftQueue((previous) => previous.slice(1));
  }, []);

  const handleScreenTap = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("[data-no-heart]")
    ) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const gradients = [
      { start: "#FF39B8", end: "#B026FF" },
      { start: "#FF58D0", end: "#8B35FF" },
      { start: "#F725A5", end: "#6D28D9" },
      { start: "#FF72C6", end: "#A855F7" },
    ];

    const gradient = gradients[Math.floor(Math.random() * gradients.length)];

    const heart: HeartParticle = {
      id: Date.now() + Math.random(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      colorStart: gradient.start,
      colorEnd: gradient.end,
    };

    setHearts((previous) => [...previous, heart]);
    setLikeCount((previous) => previous + 1);

    window.setTimeout(() => {
      setHearts((previous) => previous.filter((item) => item.id !== heart.id));
    }, 2200);
  };

  // CHARGEMENT DU LIVE ET DU PROFIL
  useEffect(() => {
    if (!id) {
      setLiveErrorMessage("Identifiant du live manquant.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadLive() {
      setLoading(true);
      setLiveErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (cancelled) return;

        setCurrentUser(user);

        const { data: liveData, error: liveError } = await supabase
          .from("lives")
          .select("*, product:products(*)")
          .eq("id", id)
          .maybeSingle();

        if (liveError) throw liveError;
        if (!liveData) throw new Error("Aucun live trouvé.");

        if (liveData.status === "ended") {
          router.replace("/");
          return;
        }

        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, country, is_verified")
          .eq("id", liveData.host_id)
          .maybeSingle();

        if (cancelled) return;

        setLive({ ...liveData, profiles: hostProfile });
        setIsHost(user?.id === liveData.host_id);
        setLikeCount(Number(liveData.like_count || 0));

        if (user) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (cancelled) return;

          setUserName(
            userProfile?.username || userProfile?.full_name || "Viewer"
          );
          setUserAvatar(userProfile?.avatar_url || null);

          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();

          setWalletBalance(Number(wallet?.balance || 0));

          if (user.id !== liveData.host_id) {
            const { data: follow } = await supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("following_id", liveData.host_id)
              .maybeSingle();

            if (!cancelled) setIsFollowing(!!follow);
          }
        }

        const { data: giftsData } = await supabase
          .from("live_gifts")
          .select("sender_id, total_price")
          .eq("live_id", id);

        if (cancelled) return;

        if (giftsData?.length) {
          const totals: Record<string, number> = {};

          giftsData.forEach((gift) => {
            if (!gift.sender_id) return;
            totals[gift.sender_id] =
              (totals[gift.sender_id] || 0) +
              Number(gift.total_price || 0);
          });

          const topIds = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([userId]) => userId);

          if (topIds.length) {
            const { data: donors } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, full_name")
              .in("id", topIds);

            if (!cancelled) setTopDonors(donors || []);
          }
        }
      } catch (error) {
        console.error("Erreur chargement live :", error);
        if (!cancelled) {
          setLiveErrorMessage(
            error instanceof Error ? error.message : "Erreur inconnue."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLive();

    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  // CHAT EN TEMPS RÉEL
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`live-chat-${id}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload as ChatMessage;
        if (!message?.id) return;

        setMessages((previous) =>
          previous.some((item) => item.id === message.id)
            ? previous
            : [...previous, message]
        );
      })
      .on("broadcast", { event: "join" }, ({ payload }) => {
        setMessages((previous) => [
          ...previous,
          {
            id: `${Date.now()}-${Math.random()}`,
            name: payload?.name || "Viewer",
            text: "a rejoint le live",
            avatar: payload?.avatar || null,
            isJoin: true,
          },
        ]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.send({
            type: "broadcast",
            event: "join",
            payload: { name: userName, avatar: userAvatar },
          });
        }
      });

    chatChannelRef.current = channel;

    return () => {
      chatChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [id, supabase, userName, userAvatar]);

  // CADEAUX EN TEMPS RÉEL
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`live-gifts-${id}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "gift" }, ({ payload }) => {
        const gift = payload as GiftAnimationItem;
        if (!gift?.id || !gift?.icon || !gift?.name) return;
        setGiftQueue((previous) => [...previous, gift]);
      })
      .subscribe();

    giftChannelRef.current = channel;

    return () => {
      giftChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ENVOYER UN MESSAGE
  const handleSendMessage = async () => {
    const text = chatMessage.trim();
    if (!text) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      name: userName,
      text,
      avatar: userAvatar,
    };

    setMessages((previous) => [...previous, message]);
    setChatMessage("");

    await chatChannelRef.current?.send({
      type: "broadcast",
      event: "message",
      payload: message,
    });
  };

  // SUIVRE / NE PLUS SUIVRE
  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    if (!live?.host_id || currentUser.id === live.host_id) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", live.host_id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: live.host_id,
        });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error: any) {
      console.error("Erreur suivi :", error);
      alert(error?.message || "Impossible de modifier le suivi.");
    } finally {
      setFollowLoading(false);
    }
  };

  // PARTAGER LE LIVE
  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Live de ${hostName}`,
          text: "Rejoins-moi sur ce live Moshi !",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setShareCopied(true);
          window.setTimeout(() => setShareCopied(false), 2000);
        } catch {
          alert(`Copie ce lien : ${url}`);
        }
      }
    }
  };

  // ENVOYER UN CADEAU
  const handleSendGift = async (gift: GiftItem, quantity = 1) => {
    if (!currentUser || !live) {
      alert("Connecte-toi pour envoyer un cadeau.");
      return;
    }

    const safeQuantity = Math.max(
      1,
      Math.min(999, Math.floor(Number(quantity) || 1))
    );

    const unitPrice = Number(gift.price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      alert("Prix du cadeau invalide.");
      return;
    }

    const totalPrice = unitPrice * safeQuantity;

    if (walletBalance < totalPrice) {
      alert("Solde insuffisant ! Recharge ton portefeuille.");
      return;
    }

    try {
      const { error: giftError } = await supabase
        .from("live_gifts")
        .insert({
          live_id: live.id,
          gift_id: gift.id,
          sender_id: currentUser.id,
          recipient_id: live.host_id,
          quantity: safeQuantity,
          total_price: totalPrice,
        });

      if (giftError) throw giftError;

      const newBalance = walletBalance - totalPrice;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", currentUser.id);

      if (walletError) {
        throw new Error(
          "Cadeau enregistré, mais le portefeuille n'a pas été mis à jour."
        );
      }

      setWalletBalance(newBalance);

      const animation: GiftAnimationItem = {
        id: `${Date.now()}-${Math.random()}`,
        icon: gift.icon,
        name: gift.name,
        senderName: userName,
        quantity: safeQuantity,
      };

      setGiftQueue((previous) => [...previous, animation]);

      await giftChannelRef.current?.send({
        type: "broadcast",
        event: "gift",
        payload: animation,
      });

      const giftMessage: ChatMessage = {
        id: animation.id,
        name: userName,
        text: `a envoyé ${
          safeQuantity > 1 ? `${safeQuantity} × ` : ""
        }${gift.icon} ${gift.name} !`,
        avatar: userAvatar,
        isGift: true,
      };

      setMessages((previous) => [...previous, giftMessage]);

      await chatChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: giftMessage,
      });
    } catch (error: any) {
      console.error("Erreur cadeau :", error);
      alert(error?.message || "Impossible d'envoyer le cadeau.");
    }
  };

  // TERMINER LE LIVE
  const handleEndLive = async () => {
    if (!live || !isHost) return;

    if (!window.confirm("Veux-tu vraiment terminer ce live ?")) return;

    const { error } = await supabase
      .from("lives")
      .update({ status: "ended" })
      .eq("id", live.id);

    if (error) {
      alert("Impossible de terminer le live.");
      console.error(error);
      return;
    }

    router.replace("/");
  };

  const hostName =
    live?.profiles?.full_name ||
    live?.profiles?.username ||
    "Hôte";

  // ACHETER LE PRODUIT
  const handleBuyProduct = () => {
    if (!live?.product?.id) return;
    router.push(`/shop/${live.product.id}`);
  };

  // CHARGEMENT
  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center">
        <p className="mb-3 text-lg font-bold text-white">
          Impossible d'ouvrir ce live
        </p>
        <p className="break-words text-sm text-red-400">
          {liveErrorMessage || "Aucune information disponible."}
        </p>
        <button
          onClick={() => router.replace("/")}
          className="mt-6 rounded-full bg-white/10 px-6 py-3 text-white"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <main
      className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden bg-black text-white"
      onClick={handleScreenTap}
    >
      {/* VIDÉO EN PLEIN ÉCRAN */}
      <LiveKitRoomComponent
        roomName={`live-${live.id}`}
        participantName={userName}
        isHost={isHost}
        onControlsReady={setMediaControls}
      />

      {/* VOILE DE LECTURE POUR LES TEXTES */}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-black/45 via-transparent to-black/65" />

      {/* ANIMATION DES CADEAUX */}
      {activeGiftAnimation && (
        <GiftAnimation
          key={activeGiftAnimation.id}
          gift={activeGiftAnimation}
          onComplete={finishGiftAnimation}
        />
      )}

      {/* EN-TÊTE : LOGO */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),14px)]">
        <div className="flex items-center justify-between">
          <Image
            src="/brand/moshi-logo.jpg"
            alt="Moshi"
            width={105}
            height={34}
            className="h-8 w-auto object-contain"
            priority
          />

          {isHost ? (
            <button
              onClick={handleEndLive}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold shadow-lg"
            >
              <span className="h-3 w-3 rounded-sm bg-white" />
              Terminer live
            </button>
          ) : (
            <button
              onClick={handleShare}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-md"
              aria-label="Partager le live"
            >
              <Share2 size={20} />
            </button>
          )}
        </div>

        {/* PROFIL + TOP DONATEURS + STATISTIQUES */}
        <div className="pointer-events-auto mt-3 grid grid-cols-[1.25fr_1fr_auto] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-full bg-black/35 p-1.5 backdrop-blur-md">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-zinc-800">
              {live.profiles?.avatar_url ? (
                <Image
                  src={live.profiles.avatar_url}
                  alt={hostName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center font-bold">
                  {hostName.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-xs font-bold">{hostName}</p>
                {live.profiles?.is_verified && (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p className="truncate text-[10px] text-white/75">
                {likeCount.toLocaleString("fr-FR")} J'aime
              </p>
            </div>

            {!isHost && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-2.5 py-2 text-[10px] font-bold disabled:opacity-50"
              >
                {followLoading ? "..." : isFollowing ? "Suivi ✓" : "+ Suivre"}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center">
            <p className="mb-1 whitespace-nowrap text-[9px] font-semibold text-white">
              👑 Top donateurs
            </p>
            <div className="flex -space-x-2">
              {topDonors.slice(0, 3).map((donor, index) => (
                <div
                  key={donor.id}
                  className="relative h-8 w-8 overflow-visible rounded-full border-2 border-white bg-zinc-800"
                >
                  {donor.avatar_url ? (
                    <Image
                      src={donor.avatar_url}
                      alt={donor.username || "Donateur"}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs">
                      {donor.username?.charAt(0) || "?"}
                    </div>
                  )}
                  {index === 0 && (
                    <Crown
                      size={12}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 fill-yellow-400 text-yellow-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Eye size={14} />
              {Number(live.viewer_count || 1).toLocaleString("fr-FR")}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Heart size={14} className="fill-pink-500 text-pink-500" />
              {likeCount.toLocaleString("fr-FR")}
            </div>
          </div>
        </div>

        {live.profiles?.country && (
          <p className="ml-3 mt-1 text-[10px] text-white/70">
            {getFlag(live.profiles.country)}
          </p>
        )}
      </header>

      {/* CŒURS MOSHI */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {hearts.map((heart) => {
          const gradientId = `heart-${String(heart.id).replace(/[^a-zA-Z0-9]/g, "")}`;

          return (
            <div
              key={heart.id}
              className="absolute"
              style={{
                left: heart.x,
                top: heart.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                className="animate-float-heart"
                style={{
                  filter: `drop-shadow(0 0 8px ${heart.colorStart})`,
                }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={heart.colorStart} />
                    <stop offset="100%" stopColor={heart.colorEnd} />
                  </linearGradient>
                </defs>
                <path
                  d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
                  fill={`url(#${gradientId})`}
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* COMMENTAIRES */}
      <section className="pointer-events-none absolute bottom-[190px] left-4 z-30 flex max-h-[23vh] w-[76%] flex-col justify-end gap-2 overflow-hidden">
        {messages.slice(-5).map((message) => (
          <div key={message.id} className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/30 bg-zinc-700">
              {message.avatar ? (
                <Image
                  src={message.avatar}
                  alt={message.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-bold">
                  {message.name.charAt(0)}
                </div>
              )}
            </div>

            <div
              className={cn(
                "max-w-full rounded-2xl px-3 py-1.5 backdrop-blur-md",
                message.isGift
                  ? "bg-gradient-to-r from-pink-500/80 to-purple-500/80"
                  : message.isJoin
                  ? "bg-purple-500/50"
                  : "bg-black/30"
              )}
            >
              <p className="text-[10px] font-bold">{message.name}</p>
              <p className="break-words text-xs">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </section>

      {/* PRODUIT ÉPINGLÉ : VENDEUR */}
      {live.product && (
        <div className="pointer-events-auto absolute bottom-[145px] left-4 right-4 z-40">
          <button
            onClick={handleBuyProduct}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/95 p-2.5 text-left text-zinc-900 shadow-xl"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              {live.product.image_url ? (
                <Image
                  src={live.product.image_url}
                  alt={live.product.title || "Produit"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <ShoppingBag className="m-auto mt-4 text-zinc-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-pink-600">
                Produit épinglé
              </p>
              <p className="truncate text-xs font-bold">
                {live.product.title}
              </p>
              <p className="text-sm font-extrabold text-purple-700">
                {Number(live.product.price || 0).toLocaleString("fr-FR")} FCFA
              </p>
            </div>

            <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2 text-xs font-bold text-white">
              <ShoppingBag size={14} />
              Acheter
            </span>
          </button>
        </div>
      )}

      {/* ZONE DE DISCUSSION + CADEAU */}
      <div
        className={cn(
          "pointer-events-auto absolute left-4 right-4 z-40 flex items-center gap-2",
          live.product ? "bottom-[78px]" : "bottom-[100px]"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-3 backdrop-blur-xl">
          <Smile size={20} className="shrink-0 text-white/80" />
          <input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSendMessage();
            }}
            placeholder="Discuter avec la créatrice..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/65"
          />
          <button onClick={() => void handleSendMessage()} aria-label="Envoyer">
            <Send size={19} />
          </button>
        </div>

        <button
          onClick={() => setIsGiftPanelOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg"
          aria-label="Envoyer un cadeau"
        >
          <Gift size={23} />
        </button>

        <button
          onClick={handleShare}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/30 backdrop-blur-md"
          aria-label="Partager"
        >
          <Share2 size={22} />
        </button>
      </div>

      {/* BARRE DES COMMANDES */}
      <nav className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/35 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
        <button
          onClick={() => void mediaControls?.toggleMicrophone()}
          disabled={!mediaControls}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-white disabled:opacity-40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            {mediaControls?.microphoneEnabled ? <Mic size={22} /> : <MicOff size={22} className="text-red-400" />}
          </span>
          <span className="text-[10px] font-semibold">Micro</span>
        </button>

        <button
          onClick={() => void mediaControls?.toggleCamera()}
          disabled={!mediaControls}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-white disabled:opacity-40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            {mediaControls?.cameraEnabled ? <Camera size={22} /> : <CameraOff size={22} className="text-red-400" />}
          </span>
          <span className="text-[10px] font-semibold">Caméra</span>
        </button>

        <button
          onClick={handleShare}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <UserPlus size={22} />
          </span>
          <span className="text-[10px] font-semibold">Inviter</span>
        </button>

        <button
          onClick={() => setIsSoundboardOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <Music size={22} />
          </span>
          <span className="text-[10px] font-semibold">Musique</span>
        </button>

        <button
          onClick={() => setIsMoreOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 text-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <MoreHorizontal size={23} />
          </span>
          <span className="text-[10px] font-semibold">Plus</span>
        </button>
      </nav>

      {/* MENU PLUS */}
      {isMoreOpen && (
        <div
          className="absolute inset-0 z-[70] flex items-end bg-black/55"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-white/10 bg-zinc-950 p-5 pb-[max(env(safe-area-inset-bottom),24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Plus d'options</h2>
              <button onClick={() => setIsMoreOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {isHost ? (
                <>
                  <button
                    onClick={() => router.push("/seller")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <Package size={25} />
                    <span className="text-xs">Produits</span>
                  </button>
                  <button
                    onClick={() => router.push("/seller")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <BarChart3 size={25} />
                    <span className="text-xs">Statistiques</span>
                  </button>
                  <button
                    onClick={() => router.push("/seller/orders")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <ClipboardList size={25} />
                    <span className="text-xs">Commandes</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => alert("La gestion des modérateurs sera disponible ici.")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <Users size={25} />
                    <span className="text-xs">Modérateurs</span>
                  </button>
                  <button
                    onClick={() => alert("Les paramètres des commentaires seront disponibles ici.")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <Settings size={25} />
                    <span className="text-xs">Commentaires</span>
                  </button>
                  <button
                    onClick={() => alert("Les paramètres du live seront disponibles ici.")}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4"
                  >
                    <Settings size={25} />
                    <span className="text-xs">Paramètres</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleShare}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold"
            >
              {shareCopied ? <Check size={18} /> : <Copy size={18} />}
              {shareCopied ? "Lien copié" : "Copier le lien du live"}
            </button>
          </div>
        </div>
      )}

      {/* PANNEAU CADEAUX */}
      <GiftPanel
        isOpen={isGiftPanelOpen}
        onClose={() => setIsGiftPanelOpen(false)}
        onSendGift={handleSendGift}
        balance={walletBalance}
      />

      {/* MUSIQUE ET EFFETS SONORES */}
      <Soundboard
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        liveId={live.id}
      />
    </main>
  );
}
