export interface PasswordStrength {
  score: number; // 0-4
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const checks = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial];
  const score = checks.filter(Boolean).length;

  const feedback: string[] = [];
  if (!hasMinLength) feedback.push("Au moins 8 caractères");
  if (!hasUpper) feedback.push("Une majuscule");
  if (!hasLower) feedback.push("Une minuscule");
  if (!hasNumber) feedback.push("Un chiffre");
  if (!hasSpecial) feedback.push("Un caractère spécial (!@#$%^&*...)");

  return {
    score: Math.min(4, score - 1),
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: score === 5,
    feedback,
  };
}
