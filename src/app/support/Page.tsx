import { SupportForm } from "@/components/support/SupportForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <HelpCircle className="w-6 h-6 text-coral" /> Aide & Litiges
      </h1>
      <p className="text-sm text-muted mb-8">
        Signalez un problème d&apos;achat, de paiement, de livraison ou de comportement.
        Votre demande est envoyée directement à l&apos;équipe Admin.
      </p>

      <div className="card mb-8">
        <SupportForm userId={user.id} />
      </div>

      {tickets && tickets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted mb-3">Vos demandes récentes</h2>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="card flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted capitalize">{t.category} · {new Date(t.created_at).toLocaleDateString("fr")}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                  t.status === "open" ? "bg-yellow-500/20 text-yellow-400" :
                  t.status === "resolved" ? "bg-green-500/20 text-green-400" :
                  "bg-white/10 text-muted"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted text-center mt-8">
        Voir aussi{" "}
        <Link href="/legal/terms" className="text-coral hover:underline">CGU</Link>
        {" · "}
        <Link href="/legal/privacy" className="text-coral hover:underline">Confidentialité</Link>
        {" · "}
        <Link href="/settings" className="text-coral hover:underline">Paramètres</Link>
      </p>
    </div>
  );
}
