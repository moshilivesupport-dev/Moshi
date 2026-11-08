"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  category: z.enum([
    "purchase", "transaction", "payment", "delivery", "user_behavior",
    "live", "account", "payout", "other",
  ]),
  subject: z.string().min(5, "Sujet trop court").max(120),
  description: z.string().min(20, "Décrivez le problème (min. 20 caractères)").max(2000),
  order_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  { value: "purchase", label: "Problème d'achat" },
  { value: "transaction", label: "Transaction / paiement" },
  { value: "payment", label: "Mobile Money / CinetPay" },
  { value: "delivery", label: "Livraison" },
  { value: "user_behavior", label: "Comportement utilisateur" },
  { value: "live", label: "Problème pendant un live" },
  { value: "account", label: "Compte / connexion" },
  { value: "payout", label: "Retrait vendeur" },
  { value: "other", label: "Autre" },
];

export function SupportForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "other" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("support_tickets").insert({
        user_id: userId,
        category: data.category,
        subject: data.subject,
        description: data.description,
        order_id: data.order_id || null,
        status: "open",
        priority: data.category === "payment" || data.category === "user_behavior" ? "high" : "normal",
      });
      if (insertError) throw insertError;
      setSuccess(true);
      reset();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card text-center py-10">
        <p className="text-green-400 font-semibold mb-2">Demande envoyée</p>
        <p className="text-sm text-muted mb-4">
          L&apos;équipe Moshi a reçu votre signalement. Vous serez notifié de la réponse.
        </p>
        <Button variant="outline" onClick={() => setSuccess(false)}>
          Nouvelle demande
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Catégorie</label>
        <select {...register("category")} className="input-field">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <Input
        label="Sujet"
        {...register("subject")}
        error={errors.subject?.message}
        placeholder="Résumé du problème"
      />

      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
        <textarea
          {...register("description")}
          rows={5}
          className="input-field resize-none"
          placeholder="Décrivez la situation, les montants, les identifiants de commande ou de live si possible..."
        />
        {errors.description && (
          <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
        )}
      </div>

      <Input
        label="ID commande (optionnel)"
        {...register("order_id")}
        placeholder="uuid de la commande"
      />

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        Envoyer au support
      </Button>
    </form>
  );
}
