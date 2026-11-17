
"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  UserRound,
  Store,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "verification-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type AccountType = "personal" | "seller";

type ProfileInfo = {
  id: string;
  role: string | null;
  is_verified: boolean;
};

type FileKind = "identity" | "selfie" | "business";

type SelectedFiles = {
  identity: File | null;
  selfie: File | null;
  business: File | null;
};

const initialFiles: SelectedFiles = {
  identity: null,
  selfie: null,
  business: null,
};

function FileField({
  title,
  description,
  icon,
  file,
  accept,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  file: File | null;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    onChange(selected);
    event.target.value = "";
  }

  return (
    <label className="block cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-purple-400">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>

        <Upload className="h-5 w-5 shrink-0 text-purple-600" />
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
        {file ? (
          <span className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{file.name}</span>
          </span>
        ) : (
          <span className="text-gray-500">Appuyer pour choisir un fichier</span>
        )}
      </div>

      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}

export default function VerificationRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [files, setFiles] = useState<SelectedFiles>(initialFiles);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const accountType: AccountType =
    profile?.role === "vendeur" ? "seller" : "personal";

  useEffect(() => {
    let active = true;

    async function loadPage() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, is_verified")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        if (active) {
          setError("Impossible de récupérer ton profil.");
          setLoading(false);
        }
        return;
      }

      const { data: pendingRequest } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (active) {
        setProfile(profileData as ProfileInfo);
        setPending(!!pendingRequest);
        setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function updateFile(kind: FileKind, file: File | null) {
    setError("");

    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(file.type)) {
        setError("Format non accepté. Utilise JPG, PNG, WEBP ou PDF.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Chaque document doit faire moins de 5 Mo.");
        return;
      }

      if (kind === "selfie" && file.type === "application/pdf") {
        setError("Le selfie doit être une image.");
        return;
      }
    }

    setFiles((previous) => ({
      ...previous,
      [kind]: file,
    }));
  }

  function getExtension(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension && /^[a-z0-9]+$/.test(extension)) {
      return extension;
    }

    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";
    if (file.type === "application/pdf") return "pdf";

    return "bin";
  }

  async function uploadDocument(
    userId: string,
    kind: FileKind,
    file: File
  ) {
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${getExtension(file)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Échec de l'envoi de ${kind}. ${uploadError.message}`);
    }

    return path;
  }

  async function submitRequest() {
    setError("");

    if (!profile) {
      setError("Profil introuvable.");
      return;
    }

    if (profile.is_verified) {
      setError("Ton compte est déjà certifié.");
      return;
    }

    if (!files.identity || !files.selfie) {
      setError("Ajoute ta pièce d'identité et ton selfie.");
      return;
    }

    if (accountType === "seller" && !files.business) {
      setError("Ajoute également un document justificatif de ton activité.");
      return;
    }

    setSubmitting(true);

    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== profile.id) {
        throw new Error("Ta session a expiré. Reconnecte-toi.");
      }

      const identityPath = await uploadDocument(
        user.id,
        "identity",
        files.identity
      );
      uploadedPaths.push(identityPath);

      const selfiePath = await uploadDocument(
        user.id,
        "selfie",
        files.selfie
      );
      uploadedPaths.push(selfiePath);

      let businessPath: string | null = null;

      if (accountType === "seller" && files.business) {
        businessPath = await uploadDocument(
          user.id,
          "business",
          files.business
        );
        uploadedPaths.push(businessPath);
      }

      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          account_type: accountType,
          status: "pending",
          id_document_path: identityPath,
          selfie_path: selfiePath,
          business_document_path: businessPath,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(true);
      setPending(true);
    } catch (err) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(uploadedPaths);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Réessaie."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-center text-red-600">
          {error || "Impossible de charger ton profil."}
        </p>
      </main>
    );
  }

  if (profile.is_verified) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-10">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm">
          <BadgeCheck className="mx-auto h-16 w-16 text-blue-500" />
          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Compte certifié
          </h1>
          <p className="mt-2 text-gray-500">
            Ton compte Moshi possède déjà sa certification.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white"
          >
            Retour
          </button>
        </div>
      </main>
    );
  }

  if (pending || success) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-10">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ShieldCheck className="h-9 w-9" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Demande en cours
          </h1>

          <p className="mt-3 leading-7 text-gray-500">
            Ta demande de certification a été enregistrée. Notre équipe
            doit maintenant examiner tes documents.
          </p>

          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Statut : En attente de vérification
          </div>

          <button
            onClick={() => router.push("/profile/edit")}
            className="mt-6 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white"
          >
            Retour au profil
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-gray-100 bg-white px-5 py-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>

        <h1 className="text-lg font-bold text-gray-900">
          Certification Moshi
        </h1>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-5 py-6">
        <section className="rounded-3xl bg-gradient-to-br from-purple-700 to-pink-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-10 w-10" />
            <div>
              <h2 className="text-xl font-bold">
                Obtiens ton badge vérifié
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Fais vérifier l'authenticité de ton compte.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            {accountType === "seller" ? (
              <Store className="h-6 w-6 text-purple-600" />
            ) : (
              <UserRound className="h-6 w-6 text-purple-600" />
            )}

            <div>
              <p className="text-sm text-gray-500">Type de compte</p>
              <p className="font-semibold text-gray-900">
                {accountType === "seller" ? "Vendeur" : "Personnel"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-bold text-gray-900">
              Documents obligatoires
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Formats acceptés : JPG, PNG, WEBP ou PDF. Maximum 5 Mo par fichier.
            </p>
          </div>

          <FileField
            title="Pièce d'identité"
            description="Carte nationale, passeport ou autre pièce officielle"
            icon={<FileText className="h-5 w-5" />}
            file={files.identity}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(file) => updateFile("identity", file)}
          />

          <FileField
            title="Selfie de vérification"
            description="Une photo nette de ton visage"
            icon={<Camera className="h-5 w-5" />}
            file={files.selfie}
            accept="image/jpeg,image/png,image/webp"
            onChange={(file) => updateFile("selfie", file)}
          />

          {accountType === "seller" && (
            <FileField
              title="Justificatif de l'activité"
              description="Document professionnel ou justificatif de ton commerce"
              icon={<Store className="h-5 w-5" />}
              file={files.business}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(file) => updateFile("business", file)}
            />
          )}
        </section>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-blue-900">
              Tes documents sont conservés dans un espace privé. Ils ne
              doivent pas être accessibles publiquement.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={submitRequest}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 font-bold text-white shadow-lg shadow-purple-200 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Envoyer ma demande
            </>
          )}
        </button>

        <p className="text-center text-xs leading-5 text-gray-400">
          L'envoi de ta demande ne garantit pas automatiquement
          l'obtention du badge. La validation est effectuée par
          l'administration Moshi.
        </p>
      </div>
    </main>
  );
}
