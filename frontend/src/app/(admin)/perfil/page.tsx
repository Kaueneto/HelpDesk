'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import { Toaster, toast } from 'react-hot-toast';
import Avatar from '@/components/Avatar';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

export default function PerfilPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, deleteAvatar, uploading } = useAvatarUpload();
  
  const [alterarSenhaAberto, setAlterarSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submittingSenha, setSubmittingSenha] = useState(false);
  const [errorSenha, setErrorSenha] = useState('');
  const [nomeEditavel, setNomeEditavel] = useState('');
  const [submittingNome, setSubmittingNome] = useState(false);
  const [errorNome, setErrorNome] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const { updateUser } = useAuth();
  
  // Detectar modo escuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  // inicializar nome editável quando o usuário carregar
  useEffect(() => {
    if (user?.name) {
      setNomeEditavel(user.name);
    }
  }, [user]);

  // proteção de autenticação
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${baseUrl}/auth/login`);
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

const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // preview da imagem
  const reader = new FileReader();
  reader.onloadend = () => {
    setPreviewAvatar(reader.result as string);
  };
  reader.readAsDataURL(file);

  // upload do arquivo para o backend
  if (!user) return;
  const avatarUrl = await uploadAvatar(file, user.id);
  
  if (avatarUrl) {
    // att no contexto
    updateUser({ avatar_url: avatarUrl });
    setPreviewAvatar(null);
  }

  // limpar input
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

const handleRemoveAvatar = async () => {
  if (!user) return;
  
  if (!confirm('Tem certeza que deseja remover seu avatar?')) return;

  try {
    const success = await deleteAvatar(user.id);
    if (success) {
      updateUser({ avatar_url: null });
      setPreviewAvatar(null);
      toast.success('Avatar removido com sucesso!');
    }
  } catch (error) {
    toast.error('Erro ao remover avatar');
  }
};
const nomeAlterado = nomeEditavel.trim() !== '' && nomeEditavel.trim() !== user?.name;

  // mostrar loading enquanto carrega  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-secondary text-lg">Carregando...</div>
      </div>
    );
  }

  // redirecionar se não autenticado
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="pb-10 min-h-screen" style={{ backgroundColor: theme.background.pagina }}>
      <Toaster position="top-right" />
      {/* Título fixo no topo esquerdo */}
      <div className="px-4 md:px-6 py-4 flex items-center gap-4" style={{ backgroundColor: theme.brand.subHeader }}>
        <button
          onClick={() => router.back()}
          className="text-white hover:opacity-80 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      
        <h1 className="text-2xl font-bold text-white">Perfil do Usuário</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* seção de avatar/foto de perfir */}
            <div className="w-full bg-elevated rounded-xl p-6 shadow-md" style={{ boxShadow: isDark ? `0 4px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(255, 255, 255, 0.08)` : undefined }}>
              <h2 className="text-lg font-semibold text-primary mb-4 font-segoe">Seu Avatar</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* preview do Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <Avatar 
                    name={user?.name} 
                    avatarUrl={previewAvatar || user?.avatar_url}
                    size="xl"
                  />
                  <p className="text-xs text-secondary text-center">
                    {user?.avatar_url && !previewAvatar ? 'Avatar atual' : previewAvatar ? 'Pré-visualização' : 'Sem avatar'}
                  </p>
                </div>

                {/* controles de upload */}
                <div className="flex-1 flex flex-col gap-4">
                  <p className="text-sm text-secondary">
                    Personalize seu perfil com uma foto. A imagem será exibida em toda a plataforma.
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploading}
                    className="hidden"
                  />

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`px-4 py-2 rounded-lg font-medium transition ${ uploading
                        ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                        : 'bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-[#A855F7] dark:hover:bg-[#9333EA] text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {uploading ? 'Enviando...' : 'Escolher Imagem'}
                    </button>

                    {(user?.avatar_url || previewAvatar) && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={uploading}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                           uploading
                            ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                              : isDark 
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                               : 'bg-red-100 hover:bg-red-200 text-red-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        remover Avatar
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-secondary">
                    Formatos suportados: JPG, PNG, GIF. Tamanho máximo: 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* dados do user + Alterar Senha */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* dados do user */}
              <div className="bg-elevated rounded-xl p-6 shadow-md" style={{ boxShadow: isDark ? `0 4px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(255, 255, 255, 0.08)` : undefined }}>
                <h2 className="text-lg font-semibold text-primary mb-4">Seus Dados</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">ID</label>
                    <input
                      type="text"
                      value={user?.id}
                      disabled
                      className="w-full px-3 py-2 rounded-lg bg-secondary/15 text-primary focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Nome</label>
                    <input
                      type="text"
                      value={nomeEditavel}
                      onChange={(e) => setNomeEditavel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/10 text-primary focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                    />
                  </div>
                  {errorNome && (
                    <div className="text-error text-sm">
                      {errorNome}
                    </div>
                  )}
                  <div>
                    <button
                      onClick={handleAlterarNome}
                      disabled={submittingNome || !nomeAlterado}
                      className={`px-4 py-2 rounded-lg text-white font-medium transition ${
                        submittingNome || !nomeAlterado ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-[#A855F7] dark:hover:bg-[#9333EA] shadow-md hover:shadow-lg'
                      }`}
                    >
                      {submittingNome ? 'Salvando...' : 'Salvar Nome'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="w-full px-3 py-2 rounded-lg bg-secondary/15 text-primary focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="bg-elevated rounded-xl overflow-hidden shadow-md" style={{ boxShadow: isDark ? `0 4px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(255, 255, 255, 0.08)` : undefined }}>
                <button
                  onClick={() => setAlterarSenhaAberto(!alterarSenhaAberto)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-[#A855F7] dark:hover:bg-[#9333EA] transition-colors"
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
                <div style={{
                  maxHeight: alterarSenhaAberto ? '600px' : '0',
                  overflow: 'hidden',
                  opacity: alterarSenhaAberto ? 1 : 0,
                  transition: 'all 300ms ease-in-out'
                }}>
                  <form className="p-6 space-y-4 bg-primary/3" onSubmit={handleAlterarSenha}>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Senha atual</label>
                      <input
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-primary bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                        placeholder="Digite sua senha atual"
                        disabled={submittingSenha}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Nova senha</label>
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-primary bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                        placeholder="Digite a nova senha"
                        disabled={submittingSenha}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-primary bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-0 transition"
                        placeholder="Confirme a nova senha"
                        disabled={submittingSenha}
                      />
                    </div>
                    {errorSenha && (
                      <div className="bg-error/15 text-error px-4 py-3 rounded-lg text-sm">
                        {errorSenha}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submittingSenha}
                      className="w-full px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-[#A855F7] dark:hover:bg-[#9333EA] text-white font-medium rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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