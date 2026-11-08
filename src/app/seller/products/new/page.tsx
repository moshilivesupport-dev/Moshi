import { ProductForm } from "@/components/product/ProductForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: categories } = await supabase.from("categories").select("id, name");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Nouveau produit</h1>
      <div className="card">
        <ProductForm sellerId={user.id} categories={categories || []} />
      </div>
    </div>
  );
}
