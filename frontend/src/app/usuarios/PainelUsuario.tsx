'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import AbrirChamado from './AbrirChamado';
import AcompanharChamado from './AcompanharChamado';
import DetalhesChamados from './DetalhesChamados';
import Configuracoes from './Configuracoes';
import SugestoesList from '@/components/sugestoes/SugestoesList';
import SugestaoDetalhe from '@/components/sugestoes/SugestaoDetalhe';
import DashboardUsuario from './DashboardUsuario';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

export default function PainelUsuario() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { mode, setTheme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'novo' | 'acompanhar' | 'sugestoes'>('home');
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [sugestaoDetalheId, setSugestaoDetalheId] = useState<number | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.name?.split(' ')[0] || 'Usuário';
    if (hour >= 6 && hour < 12) return `Bom dia, ${firstName}`;
    if (hour >= 12 && hour < 18) return `Boa tarde, ${firstName}`;
    return `Boa noite, ${firstName}`;
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${baseUrl}/auth/login`);
    }
  }, [isAuthenticated, isLoading, router]);

  const handleChamadoClick = (chamado: any) => setChamadoSelecionado(chamado);
  const handleVoltarLista = () => setChamadoSelecionado(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: mode === 'dark' ? '#0F172A' : '#f1f5f9' }}>
        <div style={{ color: mode === 'dark' ? '#94a3b8' : '#4b5563' }}>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  // paleta dinamica
  const dark = mode === 'dark';
  const bg         = dark ? '#0F172A'                   : '#f1f5f9';
  const cardBg     = dark ? '#1E293B'                   : '#f8fafc';
  const borderClr  = dark ? '#334155'                   : '#e5e7eb';
  const textPrim   = dark ? '#F1F5F9'                   : '#111827';
  const textSec    = dark ? '#94a3b8'                   : '#6b7280';
  const tabsBg     = dark ? '#0F172A'                   : 'rgba(229,231,235,0.7)';
  const tabMuted   = dark ? '#64748b'                   : '#6b7280';
  const dropdownBg = dark ? '#1E293B'                   : '#f8fafc';
  const hoverBg    = dark ? 'rgba(255,255,255,0.07)'    : '#f3f4f6';
  const dividerClr = dark ? '#334155'                   : '#e5e7eb';
  const inputBg    = dark ? '#0F172A'                   : '#ffffff';
  const logoSrc    = dark ? '/logowhite.png'            : '/logo.png';

  if (showConfiguracoes) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bg }}>
        <div className="h-screen flex flex-col">
          <Configuracoes user={user} onClose={() => setShowConfiguracoes(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 flex flex-col">
        <div
          className={`rounded-xl shadow-lg flex-1 flex flex-col min-h-0 ${activeTab === 'sugestoes' ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{ backgroundColor: cardBg, border: `1px solid ${borderClr}` }}
        >
          {/* ── Header ── */}
          <div
            className="px-6 sm:px-8 py-4 sm:py-5 flex justify-between items-center border-b"
            style={{ backgroundColor: cardBg, borderColor: borderClr }}
          >
            <div className="flex items-center gap-4">
              <img src={logoSrc} alt="Logo" className="h-6 object-contain" />
              <div className="h-6 w-px" style={{ backgroundColor: dividerClr }} />
              <h1 className="text-base font-semibold hidden font-segoe sm:block" style={{ color: textPrim }}>
                Central de Tickets
              </h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                style={{ color: textPrim }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium hidden sm:inline text-sm">{user.name}</span>
                <svg className={`w-4 h-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-60 rounded-xl shadow-xl py-1 z-50 border overflow-hidden"
                    style={{ backgroundColor: dropdownBg, borderColor: borderClr }}
                  >
                    {/* info usuário */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: borderClr }}>
                      <p className="font-semibold text-sm truncate" style={{ color: textPrim }}>{user.name}</p>
                      <p className="text-xs truncate opacity-60" style={{ color: textSec }}>{user.email}</p>
                    </div>

                    {/* toggle de tema iplamntado */}
                    <div className="px-4 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50 mb-1.5" style={{ color: textSec }}>Tema</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setTheme('light')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={mode === 'light'
                            ? { backgroundColor: '#3b82f6', color: '#fff' }
                            : { backgroundColor: hoverBg, color: textSec }}
                        >
                          <FiSun size={13} /> Claro
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={mode === 'dark'
                            ? { backgroundColor: '#3b82f6', color: '#fff' }
                            : { backgroundColor: hoverBg, color: textSec }}
                        >
                          <FiMoon size={13} /> Escuro
                        </button>
                      </div>
                    </div>

                    <div className="mx-3 my-1 h-px" style={{ backgroundColor: borderClr }} />

                    <button
                      onClick={() => { setShowConfiguracoes(true); setUserDropdownOpen(false); }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                      style={{ color: textPrim }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configurações
                    </button>

                    <div className="mx-3 my-1 h-px" style={{ backgroundColor: borderClr }} />

                    <button
                      onClick={() => { setUserDropdownOpen(false); logout(); }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors text-red-500"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="px-4 sm:px-8 py-3">
            <div
              className="grid w-full grid-cols-4 rounded-lg p-1 gap-0.5"
              style={{ backgroundColor: tabsBg }}
            >
              {([
                { key: 'home'       as const, icon: '/icons/iconhome.svg',              label: 'Início' },
                { key: 'novo'       as const, icon: '/icons/iconabrirnovochamado.svg',   label: 'Abrir Chamado' },
                { key: 'acompanhar' as const, icon: '/icons/iconacompanhar.svg',         label: 'Acompanhar' },
                { key: 'sugestoes'  as const, icon: '/icons/sugest.svg',                 label: 'Sugestões' },
              ]).map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setActiveTab(key); if (key === 'sugestoes') setSugestaoDetalheId(null); }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-all"
                  style={activeTab === key
                    ? { backgroundColor: dark ? '#334155' : '#ffffff', color: textPrim, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                    : { color: tabMuted }}
                >
                  <img src={icon} alt={label} className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Conteúdo ── */}
          <div
            className="flex-1 min-h-0 px-4 sm:px-8 py-6 overflow-y-auto"
            style={{ color: textPrim }}
          >
            {activeTab === 'home' && (
              <div className="flex flex-col h-full">
                <div className="mb-5">
                  <h2 className="text-2xl font-semibold font-segoe mb-1" style={{ color: textPrim }}>
                    {getGreeting()}!
                  </h2>
                  <p className="text-base font-segoe" style={{ color: textSec }}>Como podemos ajudar hoje?</p>
                </div>

                <div className="flex-1 flex gap-6 items-start">
                  <div className="flex-[1.4] pl-8 min-w-0 hidden sm:flex">
                    <DashboardUsuario />
                  </div>

                  <div className="flex flex-col gap-5 w-full max-w-md ml-auto pr-4 sm:pr-12">
                    <button
                      onClick={() => setActiveTab('novo')}
                      className="w-full px-12 py-7 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-3"
                    >
                      <span className="text-2xl">+</span>
                      <span>Abrir novo chamado</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('acompanhar')}
                      className="w-full px-12 py-7 bg-green-800 hover:bg-green-900 text-white text-lg font-semibold rounded-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex items-center justify-center"
                    >
                      Verificar andamento do chamado
                    </button>

                    <button
                      onClick={() => { setActiveTab('sugestoes'); setSugestaoDetalheId(null); }}
                      className="w-full px-12 py-7 text-white text-lg font-semibold rounded-lg shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                      style={{ backgroundColor: '#ff0066' }}
                    >
                      <div>Sugestões</div>
                      <div className="text-sm font-normal opacity-90 mt-1">Queremos ouvir você</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'novo' && (
              <AbrirChamado userEmail={user.email} onSuccess={() => setActiveTab('home')} onCancel={() => setActiveTab('home')} />
            )}

            {activeTab === 'acompanhar' && (
              <div>
                {!chamadoSelecionado ? (
                  <AcompanharChamado onChamadoClick={handleChamadoClick} />
                ) : (
                  <DetalhesChamados chamado={chamadoSelecionado} onVoltar={handleVoltarLista} />
                )}
              </div>
            )}

            {activeTab === 'sugestoes' && (
              <div className="-mx-4 sm:-mx-8 -my-6">
                {sugestaoDetalheId === null ? (
                  <SugestoesList onVerDetalhe={(id) => setSugestaoDetalheId(id)} hideHeader />
                ) : (
                  <SugestaoDetalhe sugestaoId={sugestaoDetalheId} onVoltar={() => setSugestaoDetalheId(null)} inlineLayout />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
