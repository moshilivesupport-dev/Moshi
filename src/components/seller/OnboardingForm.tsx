      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: urlData.publicUrl,
          country: data.country,
          age: data.age,
          gender: data.gender,
          role: "vendeur",           // au lieu de "seller"
          seller_status: "approved", // accès immédiat (plus de blocage)
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("seller_status")
        .single();