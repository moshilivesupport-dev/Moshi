
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ShieldCheck,
  User,
  Store,
  FileText,
  Camera,
  Building2,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type VerificationRequest = {
  id: string;
  user_id: string;
  account_type: "personal" | "seller";
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  documents: {
    identity: string | null;
    selfie: string | null;
    business: string | null;
  };
};

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/verifications", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible de charger les demandes.");
      }

      setRequests(result.requests || []);
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

  const reviewRequest = async (
    requestId: string,
    decision: "approved" | "rejected"
  ) => {
    const confirmation =
      decision === "approved"
        ? "Confirmer l'approbation de cette certification ?"
        : "Confirmer le refus de cette demande ?";

    if (!window.confirm(confirmation)) return;

    setProcessingId(requestId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/verifications/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          decision,
          adminNote: notes[requestId] || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible de traiter la demande.");
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
  };

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-400">
              <ShieldCheck size={18} />
              Administration Moshi
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Certifications
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Consulte et examine les demandes de certification.
            </p>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </header>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111722] p-5">
          <p className="text-sm text-gray-400">Demandes en attente</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-3xl font-bold">{pendingCount}</p>
            <div className="rounded-xl bg-yellow-500/10 p-3 text-yellow-400">
              <Clock size={25} />
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <RefreshCw className="mx-auto mb-3 animate-spin" />
            Chargement des demandes...
          </div>
        ) : requests.length === 0 && !error ? (
          <div className="rounded-2xl border border-white/10 bg-[#111722] px-5 py-16 text-center">
            <ShieldCheck
              size={38}
              className="mx-auto mb-4 text-gray-500"
            />
            <h2 className="font-semibold">
              Aucune demande pour le moment
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Les nouvelles demandes apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-white/10 bg-[#111722] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {request.account_type === "seller" ? (
                        <Store size={19} className="text-blue-400" />
                      ) : (
                        <User size={19} className="text-blue-400" />
                      )}

                      <h2 className="font-semibold">
                        {request.account_type === "seller"
                          ? "Compte vendeur"
                          : "Compte personnel"}
                      </h2>
                    </div>

                    <p className="mt-2 break-all text-xs text-gray-500">
                      ID : {request.user_id}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Envoyée le{" "}
                      {new Date(request.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : request.status === "approved"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {request.status === "pending"
                      ? "En attente"
                      : request.status === "approved"
                      ? "Approuvée"
                      : "Refusée"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DocumentLink
                    title="Pièce d'identité"
                    icon={<FileText size={19} />}
                    url={request.documents.identity}
                  />

                  <DocumentLink
                    title="Photo selfie"
                    icon={<Camera size={19} />}
                    url={request.documents.selfie}
                  />

                  {request.account_type === "seller" && (
                    <DocumentLink
                      title="Document professionnel"
                      icon={<Building2 size={19} />}
                      url={request.documents.business}
                    />
                  )}
                </div>

                {request.status === "pending" && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Note administrative (facultative)
                    </label>

                    <textarea
                      value={notes[request.id] || ""}
                      onChange={(event) =>
                        setNotes((previous) => ({
                          ...previous,
                          [request.id]: event.target.value,
                        }))
                      }
                      maxLength={1000}
                      placeholder="Ajouter une remarque..."
                      className="min-h-24 w-full rounded-xl border border-white/10 bg-[#080b12] p-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          reviewRequest(request.id, "approved")
                        }
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        {processingId === request.id
                          ? "Traitement..."
                          : "Approuver"}
                      </button>

                      <button
                        onClick={() =>
                          reviewRequest(request.id, "rejected")
                        }
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Refuser
                      </button>
                    </div>
                  </div>
                )}

                {request.admin_note && (
                  <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">
                    Note : {request.admin_note}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-500">
          Espace réservé aux administrateurs autorisés de Moshi.
        </p>
      </div>
    </main>
  );
}

function DocumentLink({
  title,
  icon,
  url,
}: {
  title: string;
  icon: React.ReactNode;
  url: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-300">
        {icon}
        {title}
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          Consulter le document
          <ExternalLink size={15} />
        </a>
      ) : (
        <span className="text-xs text-gray-500">
          Document indisponible
        </span>
      )}
    </div>
  );
}
