'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface ConfiguracoesProps {
  user: { id: number; name: string; email: string; roleId?: number };
  onClose: () => void;
}

interface Preferencia { id: number; descricao: string; }
interface PreferenciaUsuario {
  prefUsers: Array<{ prefUserId: number; preferencia: Preferencia }>;
}

function Configuracoes({ user, onClose }: ConfiguracoesProps) {
  const { updateUser } = useAuth();
  const { mode } = useTheme();
  const dark = mode === 'dark';

  const bg        = dark ? '#0F172A' : '#f9fafb';
  const cardBg    = dark ? '#1E293B' : '#ffffff';
  const borderClr = dark ? '#334155' : '#d1d5db';
  const textPrim  = dark ? '#F1F5F9' : '#111827';
  const textSec   = dark ? '#94a3b8' : '#6b7280';
  const inputBg   = dark ? '#0F172A' : '#f9fafb';
  const inputDisabledBg = dark ? '#0F172A' : '#f3f4f6';
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
  const [preferenciasNovaSugestao, setPreferenciasNovaSugestao] = useState(false);
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(true);
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false);

  const isAdmin = user.roleId === 1 || user.roleId === 3;

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
    
    // ID 2 = chamado aberto, ID 3 = chamado concluído, ID 4 = nova sugestão (só admin)
    setPreferenciasChamadoAberto(preferencias.some(p => p.preferencia.id === 2));
    setPreferenciasChamadoConcluido(preferencias.some(p => p.preferencia.id === 3));
    setPreferenciasNovaSugestao(preferencias.some(p => p.preferencia.id === 4));
  } catch (error) {
    // silencioso
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
    <div className="h-full flex flex-col" style={{ backgroundColor: bg }}>
      {/* Header */}
      <div className="px-8 py-5 flex items-center gap-4 border-b" style={{ backgroundColor: cardBg, borderColor: borderClr }}>
        <button
          onClick={() => { onClose(); setAlterarSenhaAberto(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha(''); setErrorSenha(''); setNomeEditavel(user.name); setErrorNome(''); }}
          className="p-2 rounded-lg transition-colors"
          style={{ color: textPrim }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = dark ? '#334155' : '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ color: textPrim }}>Configurações</h1>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: bg }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-row gap-8 items-start">

            {/* Dados do Usuário */}
            <div className="rounded-lg p-6 flex-1 min-w-[320px] border" style={{ backgroundColor: cardBg, borderColor: borderClr }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: textPrim }}>Seus Dados</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: textSec }}>N° de identificação</label>
                  <input type="text" value={user.id} disabled
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    style={{ backgroundColor: inputDisabledBg, borderColor: borderClr, color: textSec }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: textSec }}>Nome</label>
                  <input
                    type="text" value={nomeEditavel} onChange={e => setNomeEditavel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ backgroundColor: inputBg, borderColor: borderClr, color: textPrim }}
                    placeholder="Digite seu nome" disabled={submittingNome}
                  />
                  {errorNome && <p className="text-red-500 text-sm mt-1">{errorNome}</p>}
                  {nomeAlterado && (
                    <button onClick={handleAlterarNome} disabled={submittingNome}
                      className="mt-2 w-full px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium rounded transition text-sm">
                      {submittingNome ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: textSec }}>E-mail</label>
                  <input type="email" value={user.email} disabled
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    style={{ backgroundColor: inputDisabledBg, borderColor: borderClr, color: textSec }} />
                </div>
              </div>
            </div>

            {/* Senha + Preferências */}
            <div className="flex flex-col gap-6 flex-shrink-0 min-w-[340px] max-w-[400px] w-full">

              {/* Alterar senha */}
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: borderClr }}>
                <button
                  onClick={() => setAlterarSenhaAberto(!alterarSenhaAberto)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <span className="text-white font-semibold">Alterar Senha</span>
                  <svg className={`w-5 h-5 text-white transition-transform ${alterarSenhaAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {alterarSenhaAberto && (
                  <div className="p-6 space-y-4 border-t" style={{ backgroundColor: inputBg, borderColor: borderClr }}>
                    {[
                      { label: 'Senha Atual', val: senhaAtual, setter: setSenhaAtual, placeholder: 'Digite sua senha atual' },
                      { label: 'Nova Senha', val: novaSenha, setter: setNovaSenha, placeholder: 'Digite sua nova senha' },
                      { label: 'Confirmar Nova Senha', val: confirmarSenha, setter: setConfirmarSenha, placeholder: 'Confirme sua nova senha' },
                    ].map(({ label, val, setter, placeholder }) => (
                      <div key={label}>
                        <label className="block text-sm font-medium mb-1" style={{ color: textSec }}>{label}</label>
                        <input type="password" value={val} onChange={e => setter(e.target.value)} placeholder={placeholder}
                          disabled={submittingSenha}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ backgroundColor: cardBg, borderColor: borderClr, color: textPrim }} />
                      </div>
                    ))}
                    {errorSenha && (
                      <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-3 py-2 rounded text-sm">{errorSenha}</div>
                    )}
                    <button onClick={handleAlterarSenha} disabled={submittingSenha}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded transition text-sm">
                      {submittingSenha ? 'Atualizando...' : 'Atualizar Senha'}
                    </button>
                  </div>
                )}
              </div>

              {/* Preferências */}
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: borderClr }}>
                <div className="px-6 py-4 bg-green-600 text-white">
                  <h3 className="font-semibold">Preferências de Notificações por Email</h3>
                  <p className="text-sm opacity-90">Configure quando deseja receber notificações</p>
                </div>
                <div className="p-6 space-y-4" style={{ backgroundColor: inputBg }}>
                  {carregandoPreferencias ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                      <p className="text-sm mt-2" style={{ color: textSec }}>Carregando...</p>
                    </div>
                  ) : (
                    <>
                      {[
                        { id: 2, label: 'Chamado Aberto', desc: 'Receber email quando eu abrir um novo chamado', checked: preferenciasChamadoAberto },
                        { id: 3, label: 'Chamado Concluído', desc: 'Receber email quando meu chamado for concluído', checked: preferenciasChamadoConcluido },
                        ...(isAdmin ? [{ id: 4, label: 'Nova Sugestão', desc: 'Receber email quando novas sugestões forem criadas', checked: preferenciasNovaSugestao }] : []),
                      ].map(pref => (
                        <div key={pref.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: cardBg, borderColor: borderClr }}>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm" style={{ color: textPrim }}>{pref.label}</h4>
                            <p className="text-xs" style={{ color: textSec }}>{pref.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-3">
                            <input type="checkbox" checked={pref.checked}
                              onChange={e => salvarPreferencia(pref.id, e.target.checked)}
                              disabled={salvandoPreferencias} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
                          </label>
                        </div>
                      ))}
                      {salvandoPreferencias && <p className="text-center text-sm text-green-500">Salvando...</p>}
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
