import { z } from "zod";
import { checkPasswordStrength } from "@/lib/password";

/** Nouveau mot de passe + confirmation (mêmes règles de force que l'inscription). */
export const newPasswordSchema = z
  .object({
    password: z.string().refine((v) => checkPasswordStrength(v).isValid, {
      message: "Mot de passe trop faible",
    }),
    confirm: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type NewPasswordForm = z.infer<typeof newPasswordSchema>;
