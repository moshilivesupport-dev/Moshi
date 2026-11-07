/** Traduit les erreurs Supabase Auth en messages clairs en français. */
export function authErrorMessage(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Votre e-mail n'est pas encore confirmé. Cliquez sur le lien reçu par e-mail.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de demandes. Patientez quelques minutes avant de réessayer.";
    case "same_password":
      return "Le nouveau mot de passe doit être différent de l'ancien.";
    case "weak_password":
      return "Mot de passe trop faible. Choisissez-en un plus robuste.";
    case "email_exists":
    case "user_already_exists":
      return "Un compte existe déjà avec cet e-mail.";
    case "otp_expired":
      return "Ce lien a expiré. Demandez-en un nouveau.";
    default:
      return error.message || "Une erreur est survenue. Réessayez.";
  }
}
