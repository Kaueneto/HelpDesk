// Utilitários de segurança para validação de senhas

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SecurityUtils {
  /**
   * Valida se a senha atende aos critérios de segurança
   * - Mínimo 8 caracteres
   * - Pelo menos 1 letra maiúscula
   * - Pelo menos 1 letra minúscula
   * - Pelo menos 1 número
   * - Pelo menos 1 caractere especial
   * - Não pode conter espaços
   * - Não pode ser uma senha comum
   */
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // verificar comprimento mínimo
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres');
    }

    // verificar letra maiúscula
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 letra maiúscula');
    }

    // verificar letra minúscula
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 letra minúscula');
    }

    // verificar número
    if (!/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 número');
    }

    // verificar caractere especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 caractere especial (!@#$%^&*(),.?":{}|<>)');
    }

    // verificar se não contém espaços
    if (/\s/.test(password)) {
      errors.push('A senha não pode conter espaços');
    }

    // Lista de senhas comuns (expandir conforme necessário)
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'admin123', '12345678',
      'senha123', 'senha', '1234', '1111', '0000'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Esta senha é muito comum. Escolha uma senha mais segura');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
//gera mensagem de erro formatada pro front
  static getPasswordErrorMessage(validation: PasswordValidationResult): string {
    if (validation.isValid) return '';
    
    return `Senha inválida:\n${validation.errors.map(error => `• ${error}`).join('\n')}`;
  }

 //veriofica se o ousuario esta bloqueado por excesso de tentativas
  static isUserBlocked(tentativasLogin: number, maxTentativas: number = 5): boolean {
    return tentativasLogin >= maxTentativas;
  }

  //incrementa o contador
  static incrementLoginAttempts(currentAttempts: number): number {
    return currentAttempts + 1;
  }
//reset de contador apos logiun bem sucedido 
  static resetLoginAttempts(): number {
    return 0;
  }
}