import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isSeller =
    profile?.role === "seller" ||
    profile?.role === "admin" ||
    profile?.seller_status === "approved";

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-28">
      <div className="card text-center">
        <div className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-onyx border-2 border-coral mb-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-muted">
              {(profile?.username || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white">
          {profile?.full_name || profile?.username}
        </h1>
        <p className="text-muted text-sm">@{profile?.username}</p>
        <p className="text-xs text-champagne mt-2">
          {isSeller ? "Compte vendeur" : "Compte acheteur"}
        </p>

        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div>
            <span className="font-bold text-white">
              {profile?.followers_count || 0}
            </span>{" "}
            <span className="text-muted">abonnés</span>
          </div>
          <div>
            <span className="font-bold text-white">
              {profile?.following_count || 0}
            </span>{" "}
            <span className="text-muted">abonnements</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {isSeller ? (
            <>
              <Link href="/seller">
                <Button variant="gold" className="w-full">
                  Ouvrir le Studio
                </Button>
              </Link>
              <Link href="/seller/live">
                <Button className="w-full">Passer en live</Button>
              </Link>
              <Link href="/seller/products">
                <Button variant="outline" className="w-full">
                  Publier un produit
                </Button>
              </Link>
            </>
          ) : null}
          <Link href="/settings">
            <Button variant="outline" size="sm" className="w-full">
              Paramètres
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}