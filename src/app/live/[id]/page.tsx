
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
  X,
  Eye,
  Heart,
  ShoppingBag,
  Mic,
  Camera,
  UserPlus,
  Gift,
  MoreHorizontal,
  Send,
  Smile,
  Crown,
  Coins,
  Music,
} from "lucide-react";

import { cn, getFlag } from "@/lib/utils";

import GiftPanel from "@/components/live/GiftPanel";
import GiftAnimation from "@/components/live/GiftAnimation";
import Soundboard from "@/components/live/Soundboard";

const LiveKitRoomComponent = dynamic(
  () => import("@/components/live/LiveKitRoom"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    ),
  }
);

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  color: string;
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

// --------------------------------------------------
// LIVE ROOM
// --------------------------------------------------

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

  const [giftQueue, setGiftQueue] = useState<GiftAnimationItem[]>([]);

  const activeGiftAnimation = giftQueue[0] ?? null;

  const finishGiftAnimation = useCallback(() => {
    setGiftQueue((previous) => previous.slice(1));
  }, []);

  // --------------------------------------------------
  // HEARTS
  // --------------------------------------------------

  const handleScreenTap = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("[data-no-heart]")
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const colors = [
      "#FF8FB1",
      "#9D7BEA",
      "#60A5FA",
      "#FF4B72",
    ];

    const newHeart: HeartParticle = {
      id: Date.now() + Math.random(),
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    setHearts((previous) => [...previous, newHeart]);
    setLikeCount((previous) => previous + 1);

    window.setTimeout(() => {
      setHearts((previous) =>
        previous.filter((heart) => heart.id !== newHeart.id)
      );
    }, 2000);
  };

  // --------------------------------------------------
  // LOAD LIVE, USER AND WALLET
  // --------------------------------------------------

  useEffect(() => {
    if (!id) {
      setLiveErrorMessage("Identifiant du live manquant.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadLive = async () => {
      setLoading(true);
      setLiveErrorMessage("");

      try {
        // Utilisateur connecté
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (cancelled) return;

        setCurrentUser(user);

        // Chargement du live
        const { data: liveData, error: liveError } = await supabase
          .from("lives")
          .select("*, product:products(*)")
          .eq("id", id)
          .maybeSingle();

        if (liveError) throw liveError;

        if (!liveData) {
          throw new Error("Aucun live trouvé avec cet identifiant.");
        }

        if (liveData.status === "ended") {
          router.replace("/");
          return;
        }

        if (cancelled) return;

        // Profil de l'hôte
        const { data: hostProfile, error: hostProfileError } =
          await supabase
            .from("profiles")
            .select("username, full_name, avatar_url, country")
            .eq("id", liveData.host_id)
            .maybeSingle();

        if (hostProfileError) {
          console.error(
            "Erreur profil hôte :",
            hostProfileError.message
          );
        }

        if (cancelled) return;

        setLive({
          ...liveData,
          profiles: hostProfile,
        });

        setIsHost(user?.id === liveData.host_id);
        setLikeCount(Number(liveData.like_count || 0));

        // Profil du spectateur
        if (user) {
          const { data: userProfile, error: userProfileError } =
            await supabase
              .from("profiles")
              .select("username, full_name, avatar_url")
              .eq("id", user.id)
              .maybeSingle();

          if (userProfileError) {
            console.error(
              "Erreur profil utilisateur :",
              userProfileError.message
            );
          }

          if (cancelled) return;

          setUserName(
            userProfile?.username ||
              userProfile?.full_name ||
              "Viewer"
          );

          setUserAvatar(userProfile?.avatar_url || null);

          // Portefeuille existant
          const { data: wallet, error: walletError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();

          if (walletError) {
            console.error(
              "Erreur portefeuille :",
              walletError.message
            );
            setWalletBalance(0);
          } else {
            setWalletBalance(Number(wallet?.balance || 0));
          }
        } else {
          setUserName("Viewer");
          setUserAvatar(null);
          setWalletBalance(0);
        }

        if (cancelled) return;

        // Top donateurs
        const { data: giftsData, error: giftsError } = await supabase
          .from("live_gifts")
          .select("sender_id, total_price")
          .eq("live_id", id);

        if (giftsError) {
          console.error(
            "Erreur chargement des cadeaux :",
            giftsError.message
          );
        }

        if (cancelled) return;

        if (giftsData?.length) {
          const donorTotals: Record<string, number> = {};

          giftsData.forEach((giftRow) => {
            if (!giftRow.sender_id) return;

            donorTotals[giftRow.sender_id] =
              (donorTotals[giftRow.sender_id] || 0) +
              Number(giftRow.total_price || 0);
          });

          const topIds = Object.entries(donorTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([donorId]) => donorId);

          if (topIds.length > 0) {
            const { data: donors, error: donorsError } =
              await supabase
                .from("profiles")
                .select("id, username, avatar_url, full_name")
                .in("id", topIds);

            if (donorsError) {
              console.error(
                "Erreur classement donateurs :",
                donorsError.message
              );
            } else if (!cancelled) {
              setTopDonors(donors || []);
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement du live :", error);

        if (!cancelled) {
          setLiveErrorMessage(
            error instanceof Error
              ? error.message
              : "Une erreur inconnue est survenue."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLive();

    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  // --------------------------------------------------
  // CHAT REALTIME
  // --------------------------------------------------

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`live-chat-${id}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload as ChatMessage;

        if (!message?.id) return;

        setMessages((previous) => {
          if (previous.some((item) => item.id === message.id)) {
            return previous;
          }

          return [...previous, message];
        });
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
            payload: {
              name: userName,
              avatar: userAvatar,
            },
          });
        }
      });

    chatChannelRef.current = channel;

    return () => {
      chatChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [id, supabase, userName, userAvatar]);

  // --------------------------------------------------
  // GIFT REALTIME
  // --------------------------------------------------

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`live-gifts-${id}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
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

  // --------------------------------------------------
  // CHAT SCROLL
  // --------------------------------------------------

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // --------------------------------------------------
  // SEND CHAT MESSAGE
  // --------------------------------------------------

  const handleSendMessage = async () => {
    const text = chatMessage.trim();

    if (!text) return;

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      name: userName,
      text,
      avatar: userAvatar,
    };

    setMessages((previous) => [...previous, newMessage]);
    setChatMessage("");

    await chatChannelRef.current?.send({
      type: "broadcast",
      event: "message",
      payload: newMessage,
    });
  };

  // --------------------------------------------------
  // SEND GIFT
  // --------------------------------------------------

  const handleSendGift = async (
    gift: GiftItem,
    quantity = 1
  ) => {
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
      // Enregistrement du cadeau
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

      // Mise à jour du portefeuille
      const newBalance = walletBalance - totalPrice;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
        })
        .eq("user_id", currentUser.id);

      if (walletError) {
        throw new Error(
          "Le cadeau a été enregistré, mais le portefeuille n'a pas pu être mis à jour. Contacte l'administrateur."
        );
      }

      setWalletBalance(newBalance);

      // Animation du cadeau
      const animation: GiftAnimationItem = {
        id: `${Date.now()}-${Math.random()}`,
        icon: gift.icon,
        name: gift.name,
        senderName: userName,
        quantity: safeQuantity,
      };

      // Animation chez l'expéditeur
      setGiftQueue((previous) => [...previous, animation]);

      // Animation chez les autres participants
      await giftChannelRef.current?.send({
        type: "broadcast",
        event: "gift",
        payload: animation,
      });

      // Message cadeau dans le chat
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
      console.error("Erreur envoi cadeau :", error);

      alert(
        error?.message || "Impossible d'envoyer le cadeau."
      );
    }
  };

  // --------------------------------------------------
  // END LIVE
  // --------------------------------------------------

  const handleEndLive = async () => {
    if (!live || !isHost) return;

    const confirmed = window.confirm(
      "Veux-tu vraiment terminer ce live ?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("lives")
      .update({
        status: "ended",
      })
      .eq("id", live.id);

    if (error) {
      alert("Impossible de terminer le live.");
      console.error(error);
      return;
    }

    router.replace("/");
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center px-6 text-center">
        <p className="text-white text-lg font-bold mb-3">
          Impossible d'ouvrir ce live
        </p>

        <p className="text-red-400 text-sm break-words">
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

  const hostName =
    live.profiles?.full_name ||
    live.profiles?.username ||
    "Hôte";

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------

  return (
    <div
      className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col"
      onClick={handleScreenTap}
    >
      {/* LIVE VIDEO */}
      <LiveKitRoomComponent
        roomName={`live-${live.id}`}
        participantName={userName}
        isHost={isHost}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-20" />

      {/* GIFT ANIMATION */}
      {activeGiftAnimation && (
        <GiftAnimation
          key={activeGiftAnimation.id}
          gift={activeGiftAnimation}
          onComplete={finishGiftAnimation}
        />
      )}

      {/* HEADER */}
      <header className="relative z-40 p-4 pt-safe pointer-events-none">
        <div className="flex items-center justify-between mb-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/moshi-logo.jpg"
              alt="Moshi"
              width={100}
              height={30}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>

          {isHost ? (
            <button
              onClick={handleEndLive}
              className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"
            >
              <span className="w-3 h-3 bg-white rounded-sm" />
              Terminer live
            </button>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* HOST PROFILE */}
        <div className="flex items-start justify-between pointer-events-auto relative z-40">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-800 relative shrink-0">
              {live.profiles?.avatar_url ? (
                <Image
                  src={live.profiles.avatar_url}
                  alt={hostName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {hostName.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1">
                <p className="text-white text-sm font-bold">
                  {hostName}
                </p>

                {live.profiles?.country && (
                  <span className="text-sm">
                    {getFlag(live.profiles.country)}
                  </span>
                )}

                <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                  ✓
                </span>
              </div>

              <p className="text-white/70 text-[10px]">
                {likeCount.toLocaleString("fr-FR")} J'aime
              </p>
            </div>

            {!isHost && (
              <button className="ml-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                + Suivre
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold border border-white/10">
              <Eye size={14} />
              {live.viewer_count || 1}
            </div>
          </div>
        </div>

        {/* TOP DONORS */}
        {topDonors.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-auto relative z-40">
            <p className="text-white/80 text-[10px] font-semibold">
              👑 Top donateurs
            </p>

            <div className="flex -space-x-2">
              {topDonors.map((donor, index) => (
                <div
                  key={donor.id}
                  className="relative w-6 h-6 rounded-full border border-white overflow-hidden"
                >
                  {donor.avatar_url ? (
                    <Image
                      src={donor.avatar_url}
                      alt={donor.username || "Donateur"}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-moshi-purple flex items-center justify-center text-[8px] font-bold text-white">
                      {donor.username?.charAt(0) || "?"}
                    </div>
                  )}

                  {index === 0 && (
                    <Crown
                      size={10}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* EMPTY CENTER AREA */}
      <div className="flex-1 pointer-events-none" />

      {/* HEART PARTICLES */}
      <div className="absolute inset-0 z-[25] pointer-events-none overflow-hidden">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute"
            style={{
              left: heart.x,
              top: heart.y,
            }}
          >
            <Heart
              className="w-8 h-8 animate-float-heart"
              style={{
                fill: heart.color,
                color: heart.color,
                filter:
                  "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
          </div>
        ))}
      </div>

      {/* CHAT MESSAGES */}
      <div className="relative z-30 px-4 space-y-1.5 mb-2 max-h-[20vh] overflow-y-auto scrollbar-hide pointer-events-auto">
        {messages.slice(-3).map((message) => (
          <div
            key={message.id}
            className="flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 shrink-0">
              {message.avatar ? (
                <Image
                  src={message.avatar}
                  alt={message.name}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                  {message.name.charAt(0)}
                </div>
              )}
            </div>

            <div
              className={cn(
                "px-2.5 py-1 rounded-2xl rounded-bl-sm",
                message.isGift
                  ? "bg-gradient-to-r from-pink-500 to-purple-500"
                  : message.isJoin
                  ? "bg-purple-500/40"
                  : "bg-black/30 backdrop-blur-sm"
              )}
            >
              <p className="text-white text-[9px] font-bold">
                {message.name}
              </p>

              <p className="text-white text-[11px]">
                {message.text}
              </p>
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* PINNED PRODUCT */}
      {live.product && (
        <div className="relative z-30 px-4 mb-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 flex items-center gap-3 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
              {live.product.image_url ? (
                <Image
                  src={live.product.image_url}
                  alt={live.product.title || "Produit"}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <ShoppingBag className="m-auto text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-red-500 font-bold mb-0.5">
                Produit épinglé
              </p>

              <p className="text-xs font-bold text-gray-900 truncate">
                {live.product.title}
              </p>

              <p className="text-sm font-extrabold text-moshi-purple">
                {Number(live.product.price || 0).toLocaleString("fr-FR")} FCFA
              </p>
            </div>

            <button className="moshi-gradient text-white px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              <ShoppingBag size={14} />
              Acheter
            </button>
          </div>
        </div>
      )}

      {/* CHAT INPUT AND GIFT BUTTON */}
      <div className="relative z-40 px-4 mb-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 flex items-center gap-2 max-w-[75%]">
            <Smile size={16} className="text-white/60 shrink-0" />

            <input
              type="text"
              placeholder="Discuter..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSendMessage();
                }
              }}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none min-w-0"
            />

            <button
              onClick={() => void handleSendMessage()}
              className="text-white shrink-0"
            >
              <Send size={14} />
            </button>
          </div>

          <button
            onClick={() => setIsGiftPanelOpen(true)}
            className="flex flex-col items-center gap-0.5 shrink-0"
          >
            <div className="w-10 h-10 rounded-full moshi-gradient flex items-center justify-center text-white shadow-lg">
              <Gift size={18} />
            </div>

            <div className="flex items-center gap-0.5 bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
              <Coins size={8} className="text-yellow-400" />

              <span className="text-yellow-400 text-[9px] font-bold">
                {walletBalance.toLocaleString("fr-FR")}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="relative z-40 flex items-center justify-around px-4 pb-safe pb-4 pointer-events-auto">
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Mic size={18} />
          </div>

          <span className="text-[9px] font-semibold">
            Micro
          </span>
        </button>

        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Camera size={18} />
          </div>

          <span className="text-[9px] font-semibold">
            Caméra
          </span>
        </button>

        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <UserPlus size={18} />
          </div>

          <span className="text-[9px] font-semibold">
            Inviter
          </span>
        </button>

        <button
          onClick={() => setIsSoundboardOpen(true)}
          className="flex flex-col items-center gap-1 text-white/80"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Music size={18} />
          </div>

          <span className="text-[9px] font-semibold">
            Sons
          </span>
        </button>

        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <MoreHorizontal size={18} />
          </div>

          <span className="text-[9px] font-semibold">
            Plus
          </span>
        </button>
      </div>

      {/* GIFT PANEL */}
      <GiftPanel
        isOpen={isGiftPanelOpen}
        onClose={() => setIsGiftPanelOpen(false)}
        onSendGift={handleSendGift}
        balance={walletBalance}
      />

      {/* SOUNDBOARD */}
      <Soundboard
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        liveId={live.id}
      />
    </div>
  );
}
