/**
 * Interface que representa os dados do usuário autenticado
 */
export interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
  ativo: boolean;
  avatar_url?: string | null;
}

/**
 * Interface para dados de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface para resposta de login da API
 */
export interface LoginResponse {
  mensagem: string;
  user: {
    id: number;
    name: string;
    email: string;
    roleId: number;
    ativo: boolean;
    avatar_url?: string | null;
    token: string;
  };
}
