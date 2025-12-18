'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'entrar' | 'cadastrar'>('entrar');
  
  // Estados do Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados do Cadastro
  const [cadastroName, setCadastroName] = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroPassword, setCadastroPassword] = useState('');
  const [cadastroConfirmPassword, setCadastroConfirmPassword] = useState('');
  const [cadastroError, setCadastroError] = useState('');
  const [cadastroLoading, setCadastroLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      
      // Redireciona baseado no roleId do usuário
      // Busca o user atualizado do contexto após login
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (loggedUser.roleId === 1) {
        router.push('/admin/painel');
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

  const handleCadastroSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCadastroError('');

    if (cadastroPassword !== cadastroConfirmPassword) {
      setCadastroError('As senhas não coincidem.');
      return;
    }

    if (cadastroPassword.length < 6) {
      setCadastroError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCadastroLoading(true);

    try {
      await api.post('/users', {
        name: cadastroName,
        email: cadastroEmail,
        password: cadastroPassword,
        roleId: 2,
        ativo: true,
      });

      setCadastroName('');
      setCadastroEmail('');
      setCadastroPassword('');
      setCadastroConfirmPassword('');
      setActiveTab('entrar');
      setError('');
      
      alert('Cadastro realizado com sucesso! Faça login para continuar.');
    } catch (err: any) {
      setCadastroError(err.response?.data?.mensagem || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setCadastroLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mt-24 w-full max-w-md px-4">
        {/* Título */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-10">
          Sistema de Chamados
        </h1>

        {/* Container Tabs */}
        <div className="w-full">
          {/* Barra de Tabs */}
          <div className="h-11 items-center justify-center rounded-lg bg-gray-200/60 p-1 grid grid-cols-2 gap-1 mb-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('entrar');
                setError('');
                setCadastroError('');
              }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'entrar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('cadastrar');
                setError('');
                setCadastroError('');
              }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'cadastrar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg">
            {/* Tab Entrar */}
            {activeTab === 'entrar' && (
              <div className="p-6 space-y-4 animate-in fade-in duration-300">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
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

                  <div className="space-y-2">
                    <label
                      htmlFor="login-password"
                      className="text-sm font-medium leading-none text-black-700"
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
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full"
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </button>

                  <div className="text-center pt-2">
                    <a
                      href="/recuperar-senha"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Esqueci minha senha
                    </a>
                  </div>
                </form>
              </div>
            )}

            {/* Tab Cadastrar */}
            {activeTab === 'cadastrar' && (
              <div className="p-6 space-y-4 animate-in fade-in duration-300">
                <form onSubmit={handleCadastroSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-name"
                      className="text-sm font-medium leading-none text-gray-700"
                    >
                      Nome completo
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      value={cadastroName}
                      onChange={(e) => setCadastroName(e.target.value)}
                      required
                      minLength={3}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Seu nome completo"
                      disabled={cadastroLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-email"
                      className="text-sm font-medium leading-none text-gray-700"
                    >
                      E-mail
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      value={cadastroEmail}
                      onChange={(e) => setCadastroEmail(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="seu@email.com"
                      disabled={cadastroLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-password"
                      className="text-sm font-medium leading-none text-gray-700"
                    >
                      Senha
                    </label>
                    <input
                      id="register-password"
                      type="password"
                      value={cadastroPassword}
                      onChange={(e) => setCadastroPassword(e.target.value)}
                      required
                      minLength={6}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Mínimo 6 caracteres"
                      disabled={cadastroLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-confirm"
                      className="text-sm font-medium leading-none text-gray-700"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="register-confirm"
                      type="password"
                      value={cadastroConfirmPassword}
                      onChange={(e) => setCadastroConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Repita sua senha"
                      disabled={cadastroLoading}
                    />
                  </div>

                  {cadastroError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                      {cadastroError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cadastroLoading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full"
                  >
                    {cadastroLoading ? 'Cadastrando...' : 'Cadastrar'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('entrar')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Já tenho conta
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
