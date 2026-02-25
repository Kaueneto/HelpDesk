'use client';

import { useState, useEffect } from 'react';
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

interface Preferencia {
  id: number;
  descricao: string;
}

interface PreferenciaUsuario {
  prefUsers: Array<{
    prefUserId: number;
    preferencia: Preferencia;
  }>;
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

  // Estados para preferências
  const [preferenciasChamadoAberto, setPreferenciasChamadoAberto] = useState(false);
  const [preferenciasChamadoConcluido, setPreferenciasChamadoConcluido] = useState(false);
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(true);
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false);

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

// Funções para preferências
const carregarPreferencias = async () => {
  try {
    setCarregandoPreferencias(true);
    const response = await api.get<PreferenciaUsuario>(`/preferencias/usuario/${user.id}`);
    
    const preferencias = response.data.prefUsers || [];
    
    // ID 2 = chamado aberto, ID 3 = chamado concluído
    setPreferenciasChamadoAberto(preferencias.some(p => p.preferencia.id === 2));
    setPreferenciasChamadoConcluido(preferencias.some(p => p.preferencia.id === 3));
  } catch (error) {
    console.error('Erro ao carregar preferências:', error);
  } finally {
    setCarregandoPreferencias(false);
  }
};

const salvarPreferencia = async (preferenciaId: number, ativa: boolean) => {
  try {
    setSalvandoPreferencias(true);
    
    if (ativa) {
      // Ativar preferência
      await api.post('/preferencias/usuario', {
        usuarioId: user.id,
        preferenciaId
      });
    } else {
      // Desativar preferência
      await api.delete(`/preferencias/usuario/${user.id}/${preferenciaId}`);
    }
    
    // Recarregar preferências
    await carregarPreferencias();
  } catch (error) {
    console.error('Erro ao salvar preferência:', error);
    alert('Erro ao salvar preferência. Tente novamente.');
  } finally {
    setSalvandoPreferencias(false);
  }
};

// Carregar preferências ao montar o componente
useEffect(() => {
  carregarPreferencias();
}, [user.id]);

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

            {/* Container para Senha e Preferências */}
            <div className="flex flex-col gap-6 flex-shrink-0 min-w-[340px] max-w-[400px] w-full">
              {/* Seção de alterar senha */}
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

              {/* Seção de Preferências */}
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                <div className="w-full px-6 py-4 bg-green-500 text-white">
                  <h3 className="font-semibold">Preferências de Email</h3>
                  <p className="text-sm opacity-90">Configure quando deseja receber notificações por email</p>
                </div>

                <div className="p-6 space-y-4 bg-gray-50">
                  {carregandoPreferencias ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      <p className="text-sm text-gray-600 mt-2">Carregando preferências...</p>
                    </div>
                  ) : (
                    <>
                      {/* Preferência: Chamado Aberto */}
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">Chamado Aberto</h4>
                          <p className="text-sm text-gray-600">Receber email quando eu abrir um novo chamado</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferenciasChamadoAberto}
                            onChange={(e) => salvarPreferencia(2, e.target.checked)}
                            disabled={salvandoPreferencias}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Preferência: Chamado Concluído */}
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">Chamado Concluído</h4>
                          <p className="text-sm text-gray-600">Receber email quando meu chamado for concluído</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferenciasChamadoConcluido}
                            onChange={(e) => salvarPreferencia(3, e.target.checked)}
                            disabled={salvandoPreferencias}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {salvandoPreferencias && (
                        <div className="text-center py-2">
                          <p className="text-sm text-green-600">Salvando...</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracoes;
