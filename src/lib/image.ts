/**
 * Relit une photo choisie par l'utilisateur et la convertit en JPEG léger,
 * entièrement en mémoire. Sur iPhone, envoyer directement le fichier choisi
 * dans la photothèque échoue parfois ("No content provided") ; cette étape
 * règle le problème, corrige l'orientation et réduit le poids (HEIC compris sur Safari).
 */
export async function resizeToJpeg(file: File, maxSize = 1080, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Impossible de lire cette photo. Choisissez une photo JPG, PNG ou WebP."));
      image.src = url;
    });

    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Votre navigateur ne permet pas de préparer la photo.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size === 0) throw new Error("La préparation de la photo a échoué. Réessayez.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
