
"use client";

import { useCallback, useEffect, useState } from "react";

type CountryRequest = {
  id: string;
  user_id: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
};

function extractField(description: string, field: string) {
  const line = description
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(field.toLowerCase()));

  return line ? line.split(":").slice(1).join(":").trim() : "Non renseigné";
}

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "En attente";
    case "in_progress":
      return "En cours";
    case "resolved":
      return "Approuvée";
    case "closed":
      return "Refusée";
    default:
      return status;
  }
}

export default function CountryChangeAdminPage() {
  const [requests, setRequests] = useState<CountryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/country-change/review", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Chargement impossible.");
      }

      setRequests(result.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleDecision(
    requestId: string,
    decision: "approved" | "rejected" | "in_progress"
  ) {
    const confirmation =
      decision === "approved"
        ? "Approuver ce changement et modifier le pays du compte ?"
        : decision === "rejected"
          ? "Refuser définitivement cette demande ?"
          : "Mettre cette demande en cours de traitement ?";

    if (!window.confirm(confirmation)) return;

    setProcessingId(requestId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/country-change/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          decision,
          adminNote: notes[requestId] || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Traitement impossible.");
      }

      setMessage(result.message || "Demande traitée.");
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = requests.filter(
    (item) => item.status === "open"
  ).length;

  const progressCount = requests.filter(
    (item) => item.status === "in_progress"
  ).length;

  const resolvedCount = requests.filter(
    (item) => item.status === "resolved"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              MOSHI ADMIN
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Changements de pays
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Examine et traite les demandes des utilisateurs.
            </p>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Actualiser
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">En attente</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">En cours</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {progressCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Approuvées</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {resolvedCount}
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Chargement des demandes...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-lg font-semibold">Aucune demande</p>
            <p className="mt-2 text-sm text-slate-400">
              Les demandes de changement de pays apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((item) => {
              const currentCountry = extractField(
                item.description,
                "Pays actuel"
              );

              const requestedCountry = extractField(
                item.description,
                "Pays demandé"
              );

              const reason = extractField(
                item.description,
                "Motif de la demande"
              );

              const isFinal =
                item.status === "resolved" || item.status === "closed";

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Demande #{item.id.slice(0, 8)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "open"
                          ? "bg-amber-950 text-amber-300"
                          : item.status === "in_progress"
                            ? "bg-cyan-950 text-cyan-300"
                            : item.status === "resolved"
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-red-950 text-red-300"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-800/70 p-4">
                      <p className="text-xs text-slate-400">Pays actuel</p>
                      <p className="mt-1 font-semibold">{currentCountry}</p>
                    </div>

                    <div className="rounded-xl bg-slate-800/70 p-4">
                      <p className="text-xs text-slate-400">Pays demandé</p>
                      <p className="mt-1 font-semibold text-cyan-300">
                        {requestedCountry}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-slate-400">Identifiant utilisateur</p>
                    <p className="mt-1 break-all text-sm text-slate-300">
                      {item.user_id}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-slate-400">Motif</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                      {reason}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Envoyée le{" "}
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </p>

                  {item.admin_response && (
                    <div className="mt-4 rounded-xl bg-slate-800 p-4">
                      <p className="text-xs text-slate-400">
                        Réponse administrative
                      </p>
                      <p className="mt-1 text-sm">
                        {item.admin_response}
                      </p>
                    </div>
                  )}

                  {!isFinal && (
                    <div className="mt-5 border-t border-slate-800 pt-5">
                      <label className="mb-2 block text-sm text-slate-300">
                        Réponse à l'utilisateur (facultatif)
                      </label>

                      <textarea
                        value={notes[item.id] ?? ""}
                        onChange={(event) =>
                          setNotes((previous) => ({
                            ...previous,
                            [item.id]: event.target.value,
                          }))
                        }
                        maxLength={1000}
                        rows={3}
                        placeholder="Écris une réponse..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-500"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleDecision(item.id, "in_progress")
                          }
                          disabled={processingId === item.id}
                          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600 disabled:opacity-50"
                        >
                          Mettre en cours
                        </button>

                        <button
                          onClick={() =>
                            handleDecision(item.id, "approved")
                          }
                          disabled={processingId === item.id}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Approuver
                        </button>

                        <button
                          onClick={() =>
                            handleDecision(item.id, "rejected")
                          }
                          disabled={processingId === item.id}
                          className="rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>

                      {processingId === item.id && (
                        <p className="mt-3 text-xs text-slate-400">
                          Traitement en cours...
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
