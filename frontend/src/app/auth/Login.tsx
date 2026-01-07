'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface LoginProps {
  onCadastrarClick: () => void;
  onEsqueceuSenhaClick: () => void;
}

export default function Login({ onCadastrarClick, onEsqueceuSenhaClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (loggedUser.roleId === 1) {
        router.push('/painel');
      } else {
        router.push('/usuario/inicial');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.mensagem ||
          'Erro ao fazer login. Verifique suas credenciais.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 pt-6 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="login-email"
            className="text-sm font-medium leading-none text-gray-700"
          >
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="seu@email.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="login-password"
            className="text-sm font-medium leading-none text-gray-700"
          >
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
            disabled={isLoading}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={onEsqueceuSenhaClick}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="text-center text-sm text-gray-600">
          Novo por aqui?{' '}
          <button
            type="button"
            onClick={onCadastrarClick}
            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            Cadastre-se
          </button>
        </div>
      </form>
    </div>
  );
}
