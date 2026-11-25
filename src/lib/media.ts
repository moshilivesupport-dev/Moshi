
import { createClient } from "@/lib/supabase/client";

export type MediaCategory = "avatars" | "stories" | "products";

export interface UploadedMedia {
  key: string;
  url: string;
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) {
    throw new Error("Session expirée. Reconnecte-toi.");
  }

  return session.access_token;
}

export async function uploadMoshiMedia(
  file: File,
  category: MediaCategory
): Promise<UploadedMedia> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const response = await fetch("/api/media", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error || "Impossible d'envoyer le fichier."
    );
  }

  if (!result?.key || !result?.url) {
    throw new Error("Réponse de stockage invalide.");
  }

  return {
    key: result.key,
    url: result.url,
  };
}

export async function deleteMoshiMedia(key: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(
    `/api/media?key=${encodeURIComponent(key)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error || "Impossible de supprimer le fichier."
    );
  }
}
