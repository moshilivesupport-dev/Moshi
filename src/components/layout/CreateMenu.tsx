
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Video,
  Upload,
  Radio,
  ShoppingBag,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CreateMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type UserRole = "acheteur" | "vendeur" | "admin";

export default function CreateMenu({
  isOpen,
  onClose,
}: CreateMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadRole = async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (!cancelled) {
            setRole(null);
            setError(
              "Connecte-toi pour utiliser cette fonctionnalité."
            );
          }
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        const metadataRole = user.app_metadata?.role;
        const rawRole = profile?.role || metadataRole || "acheteur";

        let normalizedRole: UserRole = "acheteur";

        if (
          rawRole === "admin" ||
          metadataRole === "admin"
        ) {
          normalizedRole = "admin";
        } else if (
          rawRole === "vendeur" ||
          rawRole === "seller" ||
          rawRole === "vendor" ||
          rawRole === "merchant" ||
          rawRole === "pro"
        ) {
          normalizedRole = "vendeur";
        }

        if (!cancelled) {
          setRole(normalizedRole);
        }
      } catch (err) {
        console.error(
          "Erreur récupération rôle utilisateur :",
          err
        );

        if (!cancelled) {
          setRole(null);
          setError(
            "Impossible de charger les autorisations du compte."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  const handleAction = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleLive = () => {
    if (role === "vendeur") {
      handleAction("/live/start");
      return;
    }

    if (role === "acheteur" || role === "admin") {
      handleAction("/live/start?mode=simple");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] p-6 pb-safe"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-moshi-text">
                  Créer
                </h2>

                {role === "admin" && (
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-purple-600">
                    <ShieldCheck size={14} />
                    Administrateur Moshi
                  </div>
                )}

                {role === "acheteur" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Partage ton contenu avec la communauté
                  </p>
                )}

                {role === "vendeur" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Publie et développe ta boutique
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-moshi-purple animate-spin" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm text-red-600">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setRole(null);
                    setError("");
                    setLoading(true);
                    router.refresh();
                  }}
                  className="mt-3 text-sm font-bold text-moshi-purple"
                >
                  Actualiser
                </button>
              </div>
            ) : role ? (
              <div className="grid grid-cols-2 gap-3">

                {/* PUBLICATION DE CONTENU CLASSIQUE */}
                <button
                  type="button"
                  onClick={() =>
                    handleAction("/create?mode=camera")
                  }
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-100 active:scale-95 transition"
                >
                  <div className="w-14 h-14 rounded-2xl moshi-gradient flex items-center justify-center text-white shadow-lg">
                    <Video size={26} />
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">
                      Enregistrer
                    </p>

                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Filmer avec la caméra
                    </p>
                  </div>
                </button>

                {/* PUBLICATION DEPUIS LA GALERIE */}
                <button
                  type="button"
                  onClick={() =>
                    handleAction("/create?mode=gallery")
                  }
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 active:scale-95 transition"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white shadow-lg">
                    <Upload size={26} />
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">
                      Galerie
                    </p>

                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Choisir une vidéo
                    </p>
                  </div>
                </button>

                {/* FONCTIONNALITÉS RÉSERVÉES AUX VENDEURS */}
                {role === "vendeur" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleAction("/live/start")
                      }
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 active:scale-95 transition"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                        <Radio size={26} />
                      </div>

                      <div className="text-center">
                        <p className="font-bold text-moshi-text text-sm">
                          Live vendeur
                        </p>

                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Vendre en direct
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAction("/seller")
                      }
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 active:scale-95 transition"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white shadow-lg">
                        <ShoppingBag size={26} />
                      </div>

                      <div className="text-center">
                        <p className="font-bold text-moshi-text text-sm">
                          Ajouter un produit
                        </p>

                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Publier dans ma boutique
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {/* LIVE CLASSIQUE ACHETEUR ET ADMIN */}
                {(role === "acheteur" || role === "admin") && (
                  <button
                    type="button"
                    onClick={handleLive}
                    className="col-span-2 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 active:scale-95 transition"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                      <Radio size={26} />
                    </div>

                    <div className="text-center">
                      <p className="font-bold text-moshi-text text-sm">
                        {role === "admin"
                          ? "Passer en live"
                          : "Lancer un Live"}
                      </p>

                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {role === "admin"
                          ? "Démarrer un direct sur Moshi"
                          : "Discuter avec ta communauté"}
                      </p>
                    </div>
                  </button>
                )}

                {/* ADMINISTRATION */}
                {role === "admin" && (
                  <button
                    type="button"
                    onClick={() => handleAction("/admin")}
                    className="col-span-2 flex items-center justify-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm font-bold text-purple-700 active:scale-95 transition"
                  >
                    <ShieldCheck size={20} />
                    Administration Moshi
                  </button>
                )}
              </div>
            ) : null}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 font-medium"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleAction("/create")}
                className="text-moshi-purple font-bold flex items-center gap-1"
              >
                Tout voir →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
