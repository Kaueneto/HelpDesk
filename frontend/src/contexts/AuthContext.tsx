'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import { User, LoginCredentials, LoginResponse } from '@/types/auth';

/**
 * Interface do contexto de autenticação
 */
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  validateToken: () => Promise<boolean>;
}

/**
 * Contexto de autenticação
 */
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * provider do contexto de autenticação  
 * gerencia estado global de autenticação com token em cookies seguros
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * valida token via cookie e carrega dados do usuário
   */
  const validateToken = async (): Promise<boolean> => {
    try {
      console.log("Validando token...");
      const response = await api.get('/validate-token');
      console.log("Token válido:", response.status, response.data);
      return true;
    } catch (error) {
      console.error("Token inválido:", error);
      return false;
    }
  };

  /**
   * carrega dados do usuário do localStorage e valida token ao iniciar
   */
  useEffect(() => {
    const loadUser = async () => {
      console.log("Carregando usuário inicial...");
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        console.log("Usuário encontrado no localStorage");
        const userData = JSON.parse(storedUser);
        
        // verificar se token ainda é valido
        const isTokenValid = await validateToken();
        
        if (isTokenValid) {
          console.log("Token válido, usuário logado");
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          console.log("Token inválido, fazendo logout");
          // Token invalido, fazer logout
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log("Nenhum usuário no localStorage");
      }

      setIsLoading(false);
      console.log("Loading concluído");
    };

    loadUser();
  }, []);

  /**
   * Função para realizar login
   * @param credentials - Email e senha do usuário
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      console.log("Iniciando login...");
      const response = await api.post<LoginResponse>('/login', credentials, {
        withCredentials: true // incluir cookies na requisicao
      });
      
      console.log("Login response:", response.status, response.data);
      
      const { user: userData } = response.data;

      console.log("Setando usuário:", userData);
      setUser(userData);
      setIsAuthenticated(true);

      // persiste  apenas dados bsicos no localstorage
      localStorage.setItem('user', JSON.stringify(userData));
      console.log("Usuário salvo no localStorage");
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  /**
   * Função para realizar logout
   * remove cookies de autenticação e limpa localstorage
   */
  const logout = async () => {
    try {
      //chamar endpoint de logou para limpar coookiue
      await api.post('/logout', {}, { withCredentials: true });
    } catch (error) {
      // Erro silencioso - não impede o logout
    }
    
    try {
      // limpa estado
      setUser(null);
      setIsAuthenticated(false);
      
      // limpa localstorage
      localStorage.removeItem('user');
      
      // usar replace para evitar voltar com botão de voltar do navegador
      window.location.replace('/auth/login');
    } catch (error) {
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
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
        validateToken,
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
