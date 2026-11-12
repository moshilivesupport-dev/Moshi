// Dans la fonction handleUpload, remplacez la partie d'insertion par ceci :

    // 1. Calculer la durée de la vidéo avant l'upload
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(file);
    
    const duration = await new Promise<number>((resolve) => {
      videoElement.onloadedmetadata = () => resolve(videoElement.duration);
    });

    // 2. Upload du fichier
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    setProgress(60);

    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
    
    setProgress(80);

    // 3. Insertion en base AVEC duration_seconds
    const { error: dbError } = await supabase.from("videos").insert({
      user_id: userId,
      url: urlData.publicUrl,
      caption: caption.trim() || null,
      is_public: isPublic,
      status: "published",
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      duration_seconds: Math.round(duration), // ✅ C'est ici que la durée est sauvée !
    });

    if (dbError) throw dbError;
    setProgress(100);
    setTimeout(() => router.push("/"), 1000);
