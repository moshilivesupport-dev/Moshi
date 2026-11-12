"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Video, VideoOff, ShoppingBag, Radio } from "lucide-react";

// ✅ MODIFICATION : Ajout de la prop isSeller
interface LiveSetupFormProps {
  userId: string;
  isSeller?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export default function LiveSetupForm({ userId, isSeller = false }: LiveSetupFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [title, setTitle] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  // ✅ MODIFICATION : Ne charger les produits que si l'utilisateur est vendeur
  useEffect(() => {
    if (!isSeller) return;

    const loadProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("seller_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setProducts(data);
    };
    loadProducts();
  }, [userId, supabase, isSeller]);

  // Activer/désactiver la caméra
  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
      setCameraError(null);
    } catch (err) {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const startLive = async () => {
    if (!title.trim()) {
      alert("Veuillez donner un titre à votre live");
      return;
    }

    setStarting(true);
    try {
      const { data: session, error } = await supabase
        .from("live_sessions")
        .insert({
          host_id: userId,
          title: title.trim(),
          status: "live",
          started_at: new Date().toISOString(),
          // ✅ MODIFICATION : product_ids seulement si vendeur
          product_ids: isSeller ? selectedProducts : [],
          room_name: `live-${Date.now()}`,
          // ✅ MODIFICATION : Ajout d'un champ pour distinguer le type de live
          host_role: isSeller ? "vendeur" : "acheteur",
        })
        .select("id")
        .single();

      if (error) throw error;

      streamRef.current?.getTracks().forEach((t) => t.stop());

      router.push(`/live/${session.id}`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du démarrage du live");
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prévisualisation caméra */}
      <div className="relative aspect-[9/16] max-h-[400px] mx-auto rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
        {cameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-400 mb-4">
              Activez votre caméra pour prévisualiser
            </p>
            <button
              onClick={toggleCamera}
              className="px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-neutral-200 transition"
            >
              Activer la caméra
            </button>
          </div>
        )}

        {cameraOn && (
          <button
            onClick={toggleCamera}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition"
          >
            <VideoOff className="w-5 h-5 text-white" />
          </button>
        )}

        {cameraError && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 px-3 py-2 rounded-lg text-xs text-white">
            {cameraError}
          </div>
        )}
      </div>

      {/* Titre du live */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Titre du live <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            isSeller 
              ? "Ex: Vente flash sneakers limited edition 🔥" 
              : "Ex: Mon avis sur le nouveau produit XYZ 💬"
          }
          maxLength={80}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition"
        />
        <p className="text-xs text-neutral-500 mt-1">{title.length}/80 caractères</p>
      </div>

      {/* ✅ MODIFICATION : Section produits seulement pour les vendeurs */}
      {isSeller && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
            <label className="text-sm font-semibold">Produits à vendre</label>
            <span className="text-xs text-neutral-500">({selectedProducts.length} sélectionnés)</span>
          </div>

          {products.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center">
              <p className="text-sm text-neutral-400 mb-3">
                Vous n'avez pas encore de produits
              </p>
              <a
                href="/boutique/new"
                className="text-red-500 text-sm font-semibold hover:underline"
              >
                Ajouter un produit
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {products.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                      isSelected ? "border-red-500" : "border-neutral-800"
                    }`}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-neutral-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                      <p className="text-xs text-red-400 font-bold">
                        {product.price.toLocaleString("fr-FR")} €
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bouton démarrer */}
      <button
        onClick={startLive}
        disabled={starting || !title.trim()}
        className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition shadow-lg shadow-red-500/20"
      >
        {starting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Démarrage...
          </>
        ) : (
          <>
            <Radio className="w-5 h-5" />
            Démarrer le live
          </>
        )}
      </button>
    </div>
  );
}
