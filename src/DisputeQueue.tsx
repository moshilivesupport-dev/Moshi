"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Check, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user?: { username: string; full_name?: string; email?: string };
}

export function DisputeQueue({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const resolve = async (id: string, status: "resolved" | "closed" | "in_progress") => {
    setLoading(true);
    try {
      await supabase
        .from("support_tickets")
        .update({
          status,
          admin_response: response || null,
          resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      setSelected(null);
      setResponse("");
    } finally {
      setLoading(false);
    }
  };

  if (tickets.length === 0 && !selected) {
    return (
      <div className="card text-center py-12 text-muted text-sm">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
        Aucun ticket ouvert
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t)}
            className={`w-full card text-left py-3 transition ${
              selected?.id === t.id ? "border-coral/50" : "hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white truncate">{t.subject}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize flex-shrink-0 ${
                t.priority === "high" || t.priority === "urgent"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-white/10 text-muted"
              }`}>
                {t.priority}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-1 capitalize">
              {t.category} · @{t.user?.username || "—"} · {new Date(t.created_at).toLocaleDateString("fr")}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="card space-y-4">
          <div>
            <p className="text-xs text-muted capitalize">{selected.category} · {selected.status}</p>
            <h3 className="text-lg font-semibold text-white mt-1">{selected.subject}</h3>
            <p className="text-xs text-muted mt-1">
              @{selected.user?.username} {selected.user?.email && `· ${selected.user.email}`}
            </p>
          </div>
          <p className="text-sm text-white/90 whitespace-pre-wrap">{selected.description}</p>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            className="input-field resize-none text-sm"
            placeholder="Réponse admin (optionnel)"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={loading} onClick={() => resolve(selected.id, "in_progress")}>
              En cours
            </Button>
            <Button size="sm" variant="gold" loading={loading} onClick={() => resolve(selected.id, "resolved")}>
              <Check className="w-3.5 h-3.5 mr-1" /> Résolu
            </Button>
            <Button size="sm" variant="ghost" loading={loading} onClick={() => resolve(selected.id, "closed")}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
