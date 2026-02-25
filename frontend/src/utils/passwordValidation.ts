export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // MINIMO 6 CARACTERES
  if (password.length < 6) {
    errors.push('A senha deve ter pelo menos 6 caracteres');
  }

  // deve conter pelo menos uma letra minuscula
  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }

  // deve conter pelo menos uma letra maiuscula
  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }

  // deve conter pelo menos um num
  if (!/\d/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  }

  // deve conter pelo menos um caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getPasswordStrengthColor(password: string): string {
  const result = validatePassword(password);
  
  if (password.length === 0) return 'border-gray-300';
  if (result.isValid) return 'border-green-500';
  if (result.errors.length <= 2) return 'border-yellow-500';
  return 'border-red-500';
}

export function getPasswordStrengthText(password: string): string {
  const result = validatePassword(password);
  
  if (password.length === 0) return '';
  if (result.isValid) return 'Senha forte ✓';
  if (result.errors.length <= 2) return 'Senha média';
  return 'Senha fraca';
}