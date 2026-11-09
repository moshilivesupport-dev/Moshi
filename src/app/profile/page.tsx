import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SellerActionGrid } from "@/components/seller/SellerActions";
import { Shield } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  approved: "Approuvé",
  pending: "En attente de validation",
  rejected: "Refusé",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isCreator = isAdmin || (profile?.role === "seller" && profile?.seller_status === "approved");
  const isPending = profile?.role === "seller" && profile?.seller_status === "pending";
  const canApply = !isCreator && !isPending;
  const roleLabel = isAdmin ? "Administrateur" : profile?.role === "seller" ? "Vendeur" : "Acheteur";
  const statusLabel = STATUS_LABEL[profile?.seller_status || ""];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="card text-center">
        <div className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-onyx border-2 border-coral mb-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-muted">
              {(profile?.username || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white">{profile?.full_name || profile?.username}</h1>
        <p className="text-muted text-sm">@{profile?.username}</p>
        <p className="text-xs text-muted mt-2">
          {roleLabel}
          {statusLabel && !isAdmin ? ` · ${statusLabel}` : ""}
        </p>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div><span className="font-bold text-white">{profile?.followers_count || 0}</span> <span className="text-muted">abonnés</span></div>
          <div><span className="font-bold text-white">{profile?.following_count || 0}</span> <span className="text-muted">abonnements</span></div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <Link href="/settings">
            <Button variant="outline" size="sm">Paramètres</Button>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm"><Shield className="w-4 h-4 mr-1.5" /> Administration</Button>
            </Link>
          )}
          {canApply && (
            <Link href="/seller/onboard">
              <Button variant="gold" size="sm">Devenir vendeur</Button>
            </Link>
          )}
        </div>
      </div>

      {isPending && (
        <div className="card border-champagne/30 text-center text-sm text-muted">
          Votre demande vendeur est en cours de vérification.
        </div>
      )}

      {isCreator && (
        <div className="card">
          <h2 className="text-base font-bold text-white mb-3">Espace vendeur</h2>
          <SellerActionGrid />
        </div>
      )}
    </div>
  );
}
