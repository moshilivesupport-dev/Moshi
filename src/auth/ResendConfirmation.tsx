"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const COOLDOWN_SECONDS = 60;

export function ResendConfirmation({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: authErrorMessage(error) });
      return;
    }
    setMessage({ type: "ok", text: "E-mail renvoyé. Pensez à vérifier vos courriers indésirables." });
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <div className="space-y-3 text-left">
      <Input
        label="Votre adresse e-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jean@example.com"
      />
      <Button
        variant="outline"
        className="w-full"
        loading={loading}
        disabled={!email || cooldown > 0}
        onClick={resend}
      >
        {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer l'e-mail de confirmation"}
      </Button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>{message.text}</p>
      )}
    </div>
  );
}
