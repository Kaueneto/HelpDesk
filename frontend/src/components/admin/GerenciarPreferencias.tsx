'use client';

import { useState, useEffect, useContext } from 'react';
import api from '@/services/api';
import { AuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Preferencia {
  id: number;
  descricao: string;
}

export default function GerenciarPreferencias() {
  const { user } = useContext(AuthContext);
  const { theme, mode } = useTheme();

  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [preferenciasUsuario, setPreferenciasUsuario] = useState<number[]>([]);
  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const responsePreferencias = await api.get('/preferencias');
      setPreferencias(responsePreferencias.data);

      if (user?.id) {
        const responseUserPrefs = await api.get(`/preferencias/user/${user.id}`);
        setPreferenciasUsuario(responseUserPrefs.data);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoading(false);
    }
  };

  const preferenciasFiltradas = preferencias.filter((pref) =>
    pref.descricao.toLowerCase().includes(filtroDescricao.toLowerCase())
  );

  const isPreferenciaAtiva = (preferenceId: number) => {
    return preferenciasUsuario.includes(preferenceId);
  };

  const togglePreferencia = async (preferenceId: number) => {
    if (!user?.id) {
      alert('Usuário não está logado');
      return;
    }

    try {
      const isAtiva = isPreferenciaAtiva(preferenceId);

      if (isAtiva) {
        await api.delete(`/preferencias/user/${user.id}/preference/${preferenceId}`);
        setPreferenciasUsuario((prev) => prev.filter((id) => id !== preferenceId));
      } else {
        await api.post(`/preferencias/user/${user.id}/preference/${preferenceId}`);
        setPreferenciasUsuario((prev) => [...prev, preferenceId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error);
      alert('Erro ao atualizar preferência');
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center px-5"
        style={{ backgroundColor: theme.background.pagina }}
      >
        <div className="flex items-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: theme.brand.subHeader }}
          />
          <span className="ml-2" style={{ color: theme.text.secondary }}>
            Carregando...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.background.pagina }}
    >
      {/* Header full width */}
      <div className="
          px-8 py-3 
          bg-gradient-to-r 
          from-blue-600 
          to-blue-700
          bg-[length:200%_100%]
          hover:bg-[position:100%_0]
          text-white
          shadow-lg
          transition-[background-position] 
          duration-500
          flex items-center justify-between
        ">
        <h1 className="text-xl font-semibold text-white hover:scale-103 transition-transform duration-300 font-segoe">
          Minhas Preferências
        </h1>
      </div>

      {/* Conteúdo */}
      <div className="px-5 pb-5 py-3">
        <div className="max-w-4xl">
          {/* Filtro */}
          <div
            className="mb-3 px-4 py-3 rounded-lg"
            style={{
              backgroundColor: theme.background.card,
              border: `1px solid ${theme.border.primary}`,
            }}
          >
            <div className="flex items-center gap-2 hover:scale-102 transition-transform duration-300">
              <input
                type="text"
                placeholder="Filtrar preferências..."
                value={filtroDescricao}
                onChange={(e) => setFiltroDescricao(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-md focus:ring-1 focus:outline-none"
                style={{
                  borderColor: theme.border.secondary,
                  backgroundColor: theme.background.surface,
                  color: theme.text.primary,
                }}
              />
              <div
                className="text-xs whitespace-nowrap"
                style={{ color: theme.text.secondary }}
              >
                {preferenciasFiltradas.length} preferencia
                {preferenciasFiltradas.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: theme.background.card,
              border: `1px solid ${theme.border.primary}`,
            }}
          >
            {preferenciasFiltradas.length === 0 ? (
              <div className="p-4 text-sm" style={{ color: theme.text.secondary }}>
                {preferencias.length === 0
                  ? 'Nenhuma preferência cadastrada no sistema.'
                  : 'Nenhuma preferência encontrada com o filtro aplicado.'}
              </div>
            ) : (
              <div>
                {preferenciasFiltradas.map((preferencia, index) => (
                  <div
                    key={preferencia.id}
                    className="py-3 px-4 transition-colors"
                    style={{
                      backgroundColor:
                        index % 2 === 0
                          ? theme.background.card
                          : theme.background.surface,
                      borderBottom:
                        index < preferenciasFiltradas.length - 1
                          ? `1px solid ${theme.border.secondary}`
                          : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isPreferenciaAtiva(preferencia.id)}
                            onChange={() => togglePreferencia(preferencia.id)}
                          />
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
                            style={{
                              border: `1px solid ${
                                isPreferenciaAtiva(preferencia.id)
                                  ? theme.brand.subHeader
                                  : mode === 'dark'
                                  ? '#4B5563'
                                  : '#888B95'
                              }`,
                              backgroundColor: isPreferenciaAtiva(preferencia.id)
                                ? theme.brand.subHeader
                                : 'transparent',
                              boxShadow: isPreferenciaAtiva(preferencia.id)
                                ? `0 0 0 1px ${theme.brand.subHeader}`
                                : `0 0 0 1px ${
                                    mode === 'dark' ? '#4B5563' : '#888B95'
                                  }`,
                            }}
                          >
                            {isPreferenciaAtiva(preferencia.id) && (
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </label>
                      </div>

                      <div>
                        <h3
                          className="text-sm font-medium"
                          style={{ color: theme.text.primary }}
                        >
                          {preferencia.descricao}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}