'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FiEye, FiEyeOff } from "react-icons/fi";

interface LoginProps {
  onCadastrarClick: () => void;
  onEsqueceuSenhaClick: () => void;
}
 const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
 
export default function Login({ onCadastrarClick, onEsqueceuSenhaClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { theme, mode } = useTheme();
  const router = useRouter();
 
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      // O contexto de auth já carrega os dados do usuário
      // Aguardar um breve momento para garantir que o estado seja atualizado
      setTimeout(() => {
        // usar o  window.location para garantir que vá para a página correta
        window.location.href = `${baseUrl}/painel`; // o admin  sempre vai para painel primeiro
      }, 100);
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
            className="text-sm font-medium leading-none transition-colors duration-300"
            style={{ color: theme.text.primary }}
          >
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: theme.background.surface,
              borderColor: theme.border.secondary,
              color: theme.text.primary,
              caretColor: theme.brand.primary
            }}
            placeholder="seu@email.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="login-password"
            className="text-sm font-medium leading-none transition-colors duration-300"
            style={{ color: theme.text.primary }}
          >
            Senha
          </label>
          
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••••"
              style={{
                backgroundColor: theme.background.surface,
                borderColor: theme.border.secondary,
                color: theme.text.primary,
                caretColor: theme.brand.primary
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 hover:opacity-75"
              style={{ color: theme.text.tertiary }}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={onEsqueceuSenhaClick}
              className="text-sm hover:opacity-80 hover:underline transition-colors font-semibold"
              style={{ color: theme.brand.primary }}
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
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 shadow hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full"
          style={{
            backgroundColor: theme.buttonsExclusivos.btDark,
            color: '#fff',
          }}
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="text-center text-sm transition-colors duration-300" style={{ color: theme.text.secondary }}>
          Novo por aqui?{' '}
          <button
            type="button"
            onClick={onCadastrarClick}
            className="hover:opacity-80 hover:underline font-semibold transition-colors"
            style={{ color: theme.brand.primary }}
          >
            Cadastre-se
          </button>
        </div>
      </form>
    </div>
  );
}
