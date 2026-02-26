'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Toaster, toast } from 'react-hot-toast';


export default function PerfilPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [alterarSenhaAberto, setAlterarSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submittingSenha, setSubmittingSenha] = useState(false);
  const [errorSenha, setErrorSenha] = useState('');
  const [nomeEditavel, setNomeEditavel] = useState('');
  const [submittingNome, setSubmittingNome] = useState(false);
  const [errorNome, setErrorNome] = useState('');
  const { updateUser } = useAuth();

  // inicializar nome editável quando o usuário carregar
  useEffect(() => {
    if (user?.name) {
      setNomeEditavel(user.name);
    }
  }, [user]);

  // proteção de autenticação
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // validar senha forte
  const validarSenhaForte = (senha: string) => {
    const erros = [];
    if (senha.length < 8) erros.push('pelo menos 8 caracteres');
    if (!/[A-Z]/.test(senha)) erros.push('uma letra maiúscula');
    if (!/[a-z]/.test(senha)) erros.push('uma letra minúscula');
    if (!/\d/.test(senha)) erros.push('um número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) erros.push('um caractere especial');
    if (/\s/.test(senha)) erros.push('não pode conter espaços');
    
    return {
      valida: erros.length === 0,
      erros
    };
  };

  const handleAlterarSenha = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorSenha('');
    
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErrorSenha('Preencha todos os campos');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      setErrorSenha('A nova senha e a confirmação não coincidem');
      return;
    }
    
    // validar senha forte
    const validacao = validarSenhaForte(novaSenha);
    if (!validacao.valida) {
      setErrorSenha(`A nova senha deve ter: ${validacao.erros.join(', ')}`);
      return;
    }
    
    setSubmittingSenha(true);
    try {
      await api.put('/users/alterar-minha-senha', {
        senhaAtual,
        novaSenha,
      });
      toast.success('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setAlterarSenhaAberto(false);
    } catch (error: any) {
      const mensagemErro = error.response?.data?.mensagem || 'Erro ao alterar senha';
      setErrorSenha(mensagemErro);
    } finally {
      setSubmittingSenha(false);
    }
  };

const handleAlterarNome = async () => {
  setErrorNome('');

  if (!nomeEditavel || nomeEditavel.trim() === '') {
    setErrorNome('O nome não pode estar vazio');
    return;
  }

  if (nomeEditavel.trim().length < 3) {
    setErrorNome('O nome deve ter pelo menos 3 caracteres');
    return;
  }

  if (nomeEditavel.trim() === user?.name) {
    setErrorNome('O nome não foi alterado');
    return;
  }

  setSubmittingNome(true);

  try {
    const response = await api.put('/users/alterar-meu-nome', {
      nome: nomeEditavel.trim(),
    });

    const novoNome = nomeEditavel.trim();

    // att no contexto de autenticação
    updateUser({ name: novoNome });

    toast.success('Nome alterado com sucesso!');
    setErrorNome('');
  } catch (error: any) {
    const mensagem = error.response?.data?.mensagem || 'Erro ao alterar nome';
    setErrorNome(mensagem);
  } finally {
    setSubmittingNome(false);
  }
};
const nomeAlterado = nomeEditavel.trim() !== '' && nomeEditavel.trim() !== user?.name;

  // mostrar loading enquanto carrega  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando...</div>
      </div>
    );
  }

  // redirecionar se não autenticado
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toaster position="top-right" />
      {/* Título fixo no topo esquerdo */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Perfil do Usuário</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-row gap-8 items-start">
            {/* Dados do Usuário */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 flex-1 min-w-[320px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                  <input
                    type="text"
                    value={user?.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={nomeEditavel}
                    onChange={(e) => setNomeEditavel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
                <div className="text-red-500 text-sm mt-1">
                  {errorNome}
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAlterarNome}
                    disabled={submittingNome || !nomeAlterado}
                    className={`px-4 py-2 rounded-md text-white font-medium ${
                      submittingNome || !nomeAlterado ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#001960] hover:bg-blue-800'
                    }`}
                  >
                    {submittingNome ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Botão de alterar senha */}
            <div className="flex flex-col flex-shrink-0 min-w-[340px] max-w-[400px] w-full">
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAlterarSenhaAberto(!alterarSenhaAberto)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-[#1A68CF] hover:bg-blue-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="text-white font-medium text-lg">Alterar sua Senha</span>
                  </div>
                  <svg className={`w-5 h-5 text-white transition-transform ${alterarSenhaAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Formulário de alteração de senha (expansível) */}
                <div className={`transition-all duration-300 ease-in-out ${alterarSenhaAberto ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <form className="p-6 space-y-4 bg-gray-50" onSubmit={handleAlterarSenha}>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Senha atual</label>
                      <input
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Digite sua senha atual"
                        disabled={submittingSenha}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Nova senha</label>
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Digite a nova senha"
                        disabled={submittingSenha}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Confirme a nova senha"
                        disabled={submittingSenha}
                      />
                    </div>
                    {errorSenha && (
                      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {errorSenha}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submittingSenha}
                      className="w-full px-6 py-3 bg-[#001960] hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingSenha ? 'Alterando...' : 'Confirmar'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}