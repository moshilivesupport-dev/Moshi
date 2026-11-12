import { createClient } from "@/lib/supabase/server";
import { Trash2, UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
        <p className="text-sm text-neutral-400 mt-1">Gérez les rôles et les comptes de la plateforme.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Date d'inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-800/50 transition">
                  <td className="px-6 py-4 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold">
                        {user.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                      @{user.username || "Sans nom"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-500' :
                      user.role === 'vendeur' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-neutral-700 text-neutral-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-blue-500 transition" title="Changer le rôle">
                        <UserCog className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-500 transition" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
