'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import { User, LoginCredentials, LoginResponse } from '@/types/auth';

/**
 * Interface do contexto de autenticação
 */
interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

/**
 * Contexto de autenticação
 */
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * Provider do contexto de autenticação
 * Gerencia estado global de autenticação e persiste no localStorage
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carrega dados do usuário do localStorage ao iniciar
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  /**
   * Função para realizar login
   * @param credentials - Email e senha do usuário
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post<LoginResponse>('/login', credentials);
      
      const { user: userData } = response.data;
      const { token: userToken, ...userDataWithoutToken } = userData;

      // Salva token e dados do usuário
      setToken(userToken);
      setUser(userDataWithoutToken);

      // Persiste no localStorage
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userDataWithoutToken));
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };

  /**
   * Função para realizar logout
   * Remove token e dados do usuário, limpa localStorage e redireciona para login
   */
  const logout = () => {
    // Limpa estado
    setToken(null);
    setUser(null);
    
    // Limpa localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Limpa qualquer outra informação em cache
    localStorage.clear();
    
    // redireciona para login (força reload completo da página)
    if (typeof window !== 'undefined') {
      // usa replace para evitar que o usuário volte pressionando "voltar"
      window.location.replace('/auth/login');
    }
  };

  /**
   * função pra atualizar os dados do usaurio
   * @param userData - Dados parciais do usuário a serem atualizados
   */
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acessar o contexto de autenticação
 * @returns Dados e funções do contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
