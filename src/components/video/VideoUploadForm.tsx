// Dans la fonction handleUpload, après la création de l'objet URL :
const handleUpload = async () => {
  if (!file || !userId) return;

  setUploading(true);
  setError(null);
  setProgress(10);

  try {
    // Calculer la durée de la vidéo
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(file);
    
    const duration = await new Promise<number>((resolve) => {
      videoElement.onloadedmetadata = () => {
        resolve(videoElement.duration);
      };
    });

    // Nom de fichier unique
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload vers le bucket 'videos'
    const { data, error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    setProgress(60);

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    setProgress(80);

    // Sauvegarder les métadonnées dans la table 'videos'
    // ✅ CORRECTION : Ajout de duration_seconds
    const { error: dbError } = await supabase.from("videos").insert({
      user_id: userId,
      url: publicUrl,
      caption: caption.trim() || null,
      is_public: isPublic,
      status: "published",
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      duration_seconds: Math.round(duration), // ✅ Ajout de la durée
    });

    if (dbError) throw dbError;

    setProgress(100);
    
    setTimeout(() => {
      router.push("/");
    }, 1000);

  } catch (err: any) {
    console.error(err);
    setError(err.message || "Une erreur est survenue lors de l'upload.");
    setUploading(false);
    setProgress(0);
  }
};
