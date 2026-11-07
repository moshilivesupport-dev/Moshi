"use client";

import { checkPasswordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
}

export function PasswordStrength({ password }: Props) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
  const labels = ["Très faible", "Faible", "Moyen", "Fort", "Excellent"];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= strength.score ? colors[strength.score] : "bg-white/10"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Force : <span className="text-white">{labels[strength.score]}</span>
      </p>
      {!strength.isValid && strength.feedback.length > 0 && (
        <ul className="text-xs text-muted space-y-0.5">
          {strength.feedback.map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <span className="text-coral">•</span> {f}
            </li>
          ))}
        </ul>
      )}
      {strength.isValid && (
        <p className="text-xs text-green-400">✓ Mot de passe valide</p>
      )}
    </div>
  );
}
