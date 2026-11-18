
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Send,
  MessageCircle,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
};

const COUNTRIES = [
  { code: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "ML", flag: "🇲🇱", name: "Mali" },
  { code: "NE", flag: "🇳🇪", name: "Niger" },
  { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun" },
  { code: "GA", flag: "🇬🇦", name: "Gabon" },
  { code: "CD", flag: "🇨🇩", name: "RD Congo" },
  { code: "CG", flag: "🇨🇬", name: "Congo" },
  { code: "TD", flag: "🇹🇩", name: "Tchad" },
  { code: "CF", flag: "🇨🇫", name: "Centrafrique" },
  { code: "MA", flag: "🇲🇦", name: "Maroc" },
  { code: "DZ", flag: "🇩🇿", name: "Algérie" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie" },
  { code: "EG", flag: "🇪🇬", name: "Égypte" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "BE", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", flag: "🇨🇭", name: "Suisse" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "US", flag: "🇺🇸", name: "États-Unis" },
  { code: "UK", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "DE", flag: "🇩🇪", name: "Allemagne" },
  { code: "IT", flag: "🇮🇹", name: "Italie" },
  { code: "ES", flag: "🇪🇸", name: "Espagne" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "BR", flag: "🇧🇷", name: "Brésil" },
  { code: "CN", flag: "🇨🇳", name: "Chine" },
  { code: "JP", flag: "🇯🇵", name: "Japon" },
  { code: "IN", flag: "🇮🇳", name: "Inde" },
  { code: "AE", flag: "🇦🇪", name: "Émirats Arabes Unis" },
  { code: "SA", flag: "🇸🇦", name: "Arabie Saoudite" },
  { code: "ZA", flag: "🇿🇦", name: "Afrique du Sud" },
];

const CATEGORIES = [
  { value: "account", label: "Compte et profil" },
  { value: "payment", label: "Paiement" },
  { value: "purchase", label: "Achat et commande" },
  { value: "live", label: "Problème pendant un live" },
  { value: "user_behavior", label: "Comportement d’un utilisateur" },
  { value: "other", label: "Autre problème" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "En attente",
  in_progress: "En cours de traitement",
  resolved: "Résolu",
  closed: "Fermé",
};

function getCountryLabel(value: string) {
  const country = COUNTRIES.find(
    (item) => item.code === value || item.name === value
  );

  return country
    ? `${country.flag} ${country.name}`
    : value || "Non renseigné";
}

export default function ReportProblemPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [category, setCategory] = useState("account");
  const [isCountryRequest, setIsCountryRequest] = useState(false);
  const [currentCountry, setCurrentCountry] = useState("");
  const [requestedCountry, setRequestedCountry] = useState("");
  const [description, setDescription] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);

      const params = new URLSearchParams(window.location.search);
      const countryMode = params.get("type") === "country";
      setIsCountryRequest(countryMode);

      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", user.id)
        .single();

      setCurrentCountry(profile?.country || "");

      const { data: ticketData, error } = await supabase
        .from("support_tickets")
        .select(
          "id, category, subject, description, status, admin_response, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && ticketData) {
        setTickets(ticketData as Ticket[]);
      }

      setLoading(false);
    };

    loadPage();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    if (description.trim().length < 10) {
      alert("Décris ton problème en au moins 10 caractères.");
      return;
    }

    if (isCountryRequest && !requestedCountry) {
      alert("Sélectionne le pays que tu souhaites demander.");
      return;
    }

    if (
      isCountryRequest &&
      requestedCountry === currentCountry
    ) {
      alert("Ce pays est déjà associé à ton compte.");
      return;
    }

    setSending(true);

    const selectedCountry = COUNTRIES.find(
      (country) => country.code === requestedCountry
    );

    if (isCountryRequest && !selectedCountry) {
      alert("Le pays sélectionné est invalide.");
      setSending(false);
      return;
    }

    const subject = isCountryRequest
      ? "Demande de changement de pays"
      : CATEGORIES.find((item) => item.value === category)?.label ||
        "Autre problème";

    const fullDescription = isCountryRequest
      ? `Pays actuel : ${currentCountry}\nPays demandé : ${selectedCountry!.code}\n\nMotif de la demande :\n${description.trim()}`
      : description.trim();

    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      category: isCountryRequest ? "account" : category,
      subject,
      description: fullDescription,
      status: "open",
    });

    if (error) {
      alert("Impossible d'envoyer la demande : " + error.message);
      setSending(false);
      return;
    }

    setSuccessMessage(
      "Ta demande a bien été envoyée à l’équipe Moshi."
    );

    setDescription("");
    setRequestedCountry("");

    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select(
        "id, category, subject, description, status, admin_response, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ticketData) {
      setTickets(ticketData as Ticket[]);
    }

    setSending(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusStyle = (status: string) => {
    if (status === "resolved" || status === "closed") {
      return "bg-green-100 text-green-700";
    }

    if (status === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-orange-100 text-orange-700";
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-9 h-9 text-moshi-purple animate-spin" />
      </div>
    );
  }

  const inputClass =
    "w-full mt-2 px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-moshi-purple text-sm";

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="sticky top-0 z-20 bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-6 h-6 text-moshi-text" />
        </button>

        <h1 className="text-lg font-bold text-moshi-text">
          Signaler un problème
        </h1>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {successMessage && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-sm">
                Demande envoyée
              </p>
              <p className="text-sm text-green-700 mt-1">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-moshi-purple" />
            </div>

            <div>
              <h2 className="font-bold text-moshi-text">
                Comment pouvons-nous t’aider ?
              </h2>
              <p className="text-xs text-gray-500">
                Notre équipe examinera ton signalement.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            {!isCountryRequest && (
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Catégorie du problème
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isCountryRequest && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-moshi-purple" />
                    <p className="font-bold text-sm text-moshi-purple">
                      Demande de changement de pays
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">
                    Le changement sera effectué uniquement après
                    validation par l’administration Moshi.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Pays actuel
                  </label>

                  <input
                    value={getCountryLabel(currentCountry)}
                    readOnly
                    className={`${inputClass} bg-gray-100 text-gray-500`}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Pays souhaité
                  </label>

                  <select
                    value={requestedCountry}
                    onChange={(e) => setRequestedCountry(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Sélectionne un pays</option>

                    {COUNTRIES.map((country) => (
                      <option
                        key={country.code}
                        value={country.code}
                      >
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-gray-700">
                {isCountryRequest
                  ? "Pourquoi souhaites-tu changer de pays ?"
                  : "Décris ton problème"}
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                minLength={10}
                maxLength={2000}
                required
                placeholder={
                  isCountryRequest
                    ? "Explique la raison de ta demande..."
                    : "Explique-nous ce qui s’est passé..."
                }
                className={`${inputClass} resize-none`}
              />

              <p className="text-xs text-gray-400 text-right mt-1">
                {description.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 rounded-xl bg-moshi-purple text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer la demande
                </>
              )}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-bold text-lg text-moshi-text">
              Mes signalements
            </h2>
            <p className="text-xs text-gray-500">
              Consulte ici l’avancement de tes demandes.
            </p>
          </div>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Tu n’as envoyé aucun signalement pour le moment.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <article
                key={ticket.id}
                className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-sm text-moshi-text">
                    {ticket.subject}
                  </h3>

                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${getStatusStyle(ticket.status)}`}
                  >
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                </div>

                <p className="text-xs text-gray-500 whitespace-pre-line line-clamp-4">
                  {ticket.description}
                </p>

                {ticket.admin_response && (
                  <div className="p-3 rounded-xl bg-purple-50">
                    <p className="text-xs font-bold text-moshi-purple mb-1">
                      Réponse de Moshi
                    </p>

                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {ticket.admin_response}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
