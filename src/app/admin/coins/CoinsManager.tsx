"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  Power,
  Coins,
  Star,
  Loader2,
  X,
  Save,
} from "lucide-react";

interface CoinPack {
  id: string;
  name: string;
  coins: number;
  bonus: number;
  price_fcfa: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PackForm {
  name: string;
  coins: string;
  bonus: string;
  price_fcfa: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: string;
}

const EMPTY_FORM: PackForm = {
  name: "",
  coins: "",
  bonus: "0",
  price_fcfa: "",
  is_popular: false,
  is_active: true,
  sort_order: "0",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-400";

const labelClass = "mb-2 block text-xs font-semibold text-gray-400";

function formatFCFA(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

export default function CoinsManager() {
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackForm>(EMPTY_FORM);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/coins", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Chargement impossible.");
      }

      setPacks(result.packs ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de chargement."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  const updateField = <K extends keyof PackForm>(
    key: K,
    value: PackForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  };

  const startEdit = (pack: CoinPack) => {
    setEditingId(pack.id);

    setForm({
      name: pack.name,
      coins: String(pack.coins),
      bonus: String(pack.bonus),
      price_fcfa: String(pack.price_fcfa),
      is_popular: pack.is_popular,
      is_active: pack.is_active,
      sort_order: String(pack.sort_order),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const savePack = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        coins: Number(form.coins),
        bonus: Number(form.bonus),
        price_fcfa: Number(form.price_fcfa),
        is_popular: form.is_popular,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
      };

      const response = await fetch("/api/admin/coins", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId ? { ...payload, id: editingId } : payload
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Enregistrement impossible.");
      }

      setSuccess(
        editingId ? "Pack modifié avec succès." : "Pack créé avec succès."
      );

      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadPacks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pack: CoinPack) => {
    const action = pack.is_active ? "désactiver" : "réactiver";

    if (
      !window.confirm(
        `Veux-tu vraiment ${action} le pack « ${pack.name} » ?`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = pack.is_active
        ? await fetch(
            `/api/admin/coins?id=${encodeURIComponent(pack.id)}`,
            { method: "DELETE" }
          )
        : await fetch("/api/admin/coins", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: pack.id,
              is_active: true,
            }),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Modification impossible.");
      }

      setSuccess(
        pack.is_active ? "Pack désactivé." : "Pack réactivé."
      );

      await loadPacks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    }
  };

  const activeCount = packs.filter((pack) => pack.is_active).length;
  const totalCoins = packs.reduce(
    (total, pack) => total + Number(pack.coins) + Number(pack.bonus),
    0
  );

  return (
    <div className="space-y-7">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
          <p className="text-sm text-gray-400">Packs enregistrés</p>
          <p className="mt-3 text-3xl font-bold">{packs.length}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
          <p className="text-sm text-gray-400">Packs actifs</p>
          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
          <p className="text-sm text-gray-400">Coins proposés</p>
          <p className="mt-3 text-3xl font-bold">
            {new Intl.NumberFormat("fr-FR").format(totalCoins)}
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#111722] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {editingId ? "Modifier le pack" : "Créer un pack"}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Les montants sont exprimés en francs CFA.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
            >
              <X size={15} />
              Annuler
            </button>
          )}
        </div>

        <form onSubmit={savePack} className="space-y-5">
          <div>
            <label className={labelClass}>Nom du pack</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ex. Pack Starter"
              minLength={2}
              maxLength={80}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre de coins</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={form.coins}
                onChange={(event) => updateField("coins", event.target.value)}
                placeholder="Ex. 100"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Bonus de coins</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                value={form.bonus}
                onChange={(event) => updateField("bonus", event.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Prix en FCFA</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={form.price_fcfa}
                onChange={(event) =>
                  updateField("price_fcfa", event.target.value)
                }
                placeholder="Ex. 1000"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Ordre d'affichage</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-4">
              <input
                type="checkbox"
                checked={form.is_popular}
                onChange={(event) =>
                  updateField("is_popular", event.target.checked)
                }
                className="h-4 w-4 accent-purple-500"
              />
              <span className="text-sm font-medium">Pack populaire</span>
              <Star size={16} className="ml-auto text-yellow-400" />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
                className="h-4 w-4 accent-purple-500"
              />
              <span className="text-sm font-medium">Pack actif</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {editingId ? "Enregistrer les modifications" : "Créer le pack"}
            </button>

            <button
              type="button"
              onClick={() => void loadPacks()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Actualiser
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Packs existants</h2>
            <p className="mt-1 text-xs text-gray-400">
              Les packs désactivés restent conservés dans la base.
            </p>
          </div>
          <Coins className="text-purple-300" />
        </div>

        {loading ? (
          <div className="flex justify-center rounded-2xl border border-white/10 bg-[#111722] py-12">
            <Loader2 className="animate-spin text-purple-300" />
          </div>
        ) : packs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#111722] px-5 py-12 text-center">
            <Coins size={35} className="mx-auto text-purple-300" />
            <h3 className="mt-4 font-bold">Aucun pack pour le moment</h3>
            <p className="mt-2 text-sm text-gray-400">
              Crée ton premier pack pour commencer à configurer les coins Moshi.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {packs.map((pack) => (
              <article
                key={pack.id}
                className="rounded-2xl border border-white/10 bg-[#111722] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{pack.name}</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Ordre : {pack.sort_order}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pack.is_popular && (
                      <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-300">
                        POPULAIRE
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        pack.is_active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {pack.is_active ? "ACTIF" : "INACTIF"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-black/20 p-4">
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat("fr-FR").format(pack.coins)}
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      coins
                    </span>
                  </p>

                  {pack.bonus > 0 && (
                    <p className="mt-1 text-xs font-semibold text-emerald-400">
                      + {new Intl.NumberFormat("fr-FR").format(pack.bonus)} coins
                      bonus
                    </p>
                  )}

                  <p className="mt-3 text-lg font-bold text-purple-300">
                    {formatFCFA(Number(pack.price_fcfa))}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(pack)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold hover:bg-white/5"
                  >
                    <Pencil size={15} />
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleActive(pack)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                      pack.is_active
                        ? "border border-red-500/20 text-red-300 hover:bg-red-500/10"
                        : "border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                    }`}
                  >
                    <Power size={15} />
                    {pack.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-gray-500">
        La gestion des packs ne déclenche aucun paiement et ne crédite aucun
        portefeuille. Les achats et les crédits de coins devront être traités
        séparément par un système de paiement sécurisé.
      </p>
    </div>
  );
}