'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';



interface RedefinirSenhaProps {
  email: string;
  token: string;
}

export default function RedefinirSenha({ email, token }: RedefinirSenhaProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      
      const response = await api.put('/update-password', {
        email,
        recoverPassword: token,
        password,
      });

      console.log('Resposta da API✅✅✅✅:', response.data);
      console.log('Status:', response.status);
      setSucesso(true);

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      console.error('ERRO COMPLETO:', err);
      
      const mensagem = err.response?.data?.mensagem;
      
      if (mensagem === 'A chave de recuperação é inválida') {
        setError(' Link de recuperação inválido ou expirado. Solicite um novo link.');
      } else {
        setError(mensagem || 'Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mt-24 w-full max-w-md px-4">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Sistema de Chamados
          </h1>
          <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
            HelpDesk
          </h3>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
            <div className="text-center space-y-4">
              <div className="text-5xl text-green-600">✓</div>
              <h2 className="text-xl font-bold text-gray-900">
                Senha redefinida com sucesso!
              </h2>
              <p className="text-gray-700">
                Você será redirecionado para a tela de login em instantes...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mt-24 w-full max-w-md px-4">
        {/* Título */}
        <h1 className="text-xl font-bold text-center text-gray-900 mb-3 font-mono">
            HelpDesk
          </h1>

        <div className="w-full">
          {/* Tab superior */}
          <div className="h-10 mb-2">
            <div className="h-10 items-center justify-center rounded-md bg-gray-200/70 p-1 text-gray-500 flex w-full">
              <div className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium bg-white text-gray-900 shadow-sm">
                Redefinição de senha
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="p-6 pt-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="new-password"
                    className="text-sm font-medium leading-none text-gray-700"
                  >
                    Digite sua nova senha:
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="confirm-password"
                    className="text-sm font-medium leading-none text-gray-700"
                  >
                    Confirme a senha digitada:
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full mt-2"
                >
                  {isLoading ? 'Confirmando...' : 'Confirmar mudança de Senha'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
