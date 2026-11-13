import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, actorId, type, message } = await req.json();

    if (!userId || !type || !message) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("notifications").insert({
      to_user_id: userId, // ✅ On utilise la bonne colonne
      actor_id: actorId || null,
      type,
      message,
      read: false,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur création notification:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}