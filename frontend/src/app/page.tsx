'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Página inicial - Redireciona baseado no estado de autenticação
 */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Se o usuário estiver logado, redireciona baseado na role
        if (user.roleId === 1) {
          // Admin vai para o painel administrativo
          router.push('/painel');
        } else {
          // Usuário comum vai para a página de usuários
          router.push('/usuario/inicial');
        }
      } else {
        // Se não estiver logado, redireciona para o login
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Mostra uma tela de loading enquanto verifica a autenticação
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}
