'use client';

import { useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface ConfiguracoesProps {
  user: {
    id: number;
    name: string;
    email: string;
  };
  onClose: () => void;
}

function Configuracoes({ user, onClose }: ConfiguracoesProps) {
  const { updateUser } = useAuth();
  const [alterarSenhaAberto, setAlterarSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submittingSenha, setSubmittingSenha] = useState(false);
  const [errorSenha, setErrorSenha] = useState('');
  
  //estados pra editar nome
  const [nomeEditavel, setNomeEditavel] = useState(user.name);
  const [submittingNome, setSubmittingNome] = useState(false);
  const [errorNome, setErrorNome] = useState('');

  const handleAlterarSenha = async () => {
    setErrorSenha('');

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErrorSenha('Todos os campos são obrigatórios');
      return;
    }

    if (novaSenha.length < 6) {
      setErrorSenha('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErrorSenha('A nova senha e a confirmação não coincidem');
      return;
    }

    setSubmittingSenha(true);

    try {
      await api.put('/users/alterar-minha-senha', {
        senhaAtual,
        novaSenha,
      });

      alert('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setAlterarSenhaAberto(false);
    } catch (error: any) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao alterar senha';
      setErrorSenha(mensagem);
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

  if (nomeEditavel.trim() === user.name) {
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

    alert('Nome alterado com sucesso!');
    setErrorNome('');
  } catch (error: any) {
    const mensagem = error.response?.data?.mensagem || 'Erro ao alterar nome';
    setErrorNome(mensagem);
  } finally {
    setSubmittingNome(false);
  }
};

const nomeAlterado = nomeEditavel.trim() !== '' && nomeEditavel.trim() !== user.name;

  return (
    <div className="h-full flex flex-col">
      {/* Header da tela de configurações */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => {
            onClose();
            setAlterarSenhaAberto(false);
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');
            setErrorSenha('');
            setNomeEditavel(user.name);
            setErrorNome('');
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Conteúdo das configurações */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-row gap-8 items-start">
            {/* Dados do Usuário */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 flex-1 min-w-[320px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° de identificação</label>
                  <input
                    type="text"
                    value={user.id}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Digite seu nome"
                    disabled={submittingNome}
                  />
                  {errorNome && (
                    <p className="text-red-600 text-sm mt-1">{errorNome}</p>
                  )}
                  {nomeAlterado && (
                    <button
                      onClick={handleAlterarNome}
                      disabled={submittingNome}
                      className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded transition"
                    >
                      {submittingNome ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Seção de alterar senha */}
            <div className="flex flex-col flex-shrink-0 min-w-[340px] max-w-[400px] w-full">
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAlterarSenhaAberto(!alterarSenhaAberto)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  <span className="text-white font-semibold">Alterar Senha</span>
                  <svg
                    className={`w-5 h-5 text-white transition-transform ${alterarSenhaAberto ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Formulário de alterar senha */}
                {alterarSenhaAberto && (
                  <div className="p-6 space-y-4 bg-gray-50 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Digite sua nova senha"
                        disabled={submittingSenha}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Confirme sua nova senha"
                        disabled={submittingSenha}
                      />
                    </div>

                    {errorSenha && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                        {errorSenha}
                      </div>
                    )}

                    <button
                      onClick={handleAlterarSenha}
                      disabled={submittingSenha}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded transition"
                    >
                      {submittingSenha ? 'Atualizando...' : 'Atualizar Senha'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracoes;
