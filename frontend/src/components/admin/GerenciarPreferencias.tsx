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
  const { theme } = useTheme();

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
      
      // carregar todas as preferências
      const responsePreferencias = await api.get('/preferencias');
      setPreferencias(responsePreferencias.data);

      // carregar preferencias do usuario logado
      if (user?.id) {
        const responseUserPrefs = await api.get(`/preferencias/user/${user.id}`);
        setPreferenciasUsuario(responseUserPrefs.data);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  // filtrar preferências
  const preferenciasFiltradas = preferencias.filter(pref =>
    pref.descricao.toLowerCase().includes(filtroDescricao.toLowerCase())
  );

  // verificar se uma preferencia está ativa para o usuário
  const isPreferenciaAtiva = (preferenceId: number) => {
    return preferenciasUsuario.includes(preferenceId);
  };

  // toggle preferencia
  const togglePreferencia = async (preferenceId: number) => {
    if (!user?.id) {
      alert('Usuário não está logado');
      return;
    }

    try {
      const isAtiva = isPreferenciaAtiva(preferenceId);
      
      if (isAtiva) {
        // remover preferencia
        await api.delete(`/preferencias/user/${user.id}/preference/${preferenceId}`);
        setPreferenciasUsuario(prev => prev.filter(id => id !== preferenceId));
      } else {
        // add preferencia
        await api.post(`/preferencias/user/${user.id}/preference/${preferenceId}`);
        setPreferenciasUsuario(prev => [...prev, preferenceId]);
      }
    } catch (error) {

      alert('Erro ao atualizar preferencia');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-left items-left h-64" style={{ backgroundColor: theme.background.surface }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.brand.subHeader }}></div>
        <span className="ml-2" style={{ color: theme.text.secondary }}>Carregando...</span>
      </div>
    );
  }

  return (
    <div className="p-5 min-h-screen" style={{ backgroundColor: theme.background.pagina }}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="py-2 mb-2 px-4 rounded-lg" style={{ backgroundColor: theme.brand.subHeader }}>
          <h1 className="text-xl font-bold text-white">
            Minhas Preferências
          </h1>
        </div>

        {/* Filtro */}
        <div className="mb-3 px-4 py-3 rounded-lg" style={{ backgroundColor: theme.background.card, border: `1px solid ${theme.border.primary}` }}>
          <div className="flex items-center gap-2">
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
            <div className="text-xs whitespace-nowrap" style={{ color: theme.text.secondary }}>
              {preferenciasFiltradas.length} preferencia{preferenciasFiltradas.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: theme.background.card, border: `1px solid ${theme.border.primary}` }}>
          {preferenciasFiltradas.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: theme.text.secondary }}>
              {preferencias.length === 0
                ? 'Nenhuma preferencia cadastrada no sistema.'
                : 'Nenhuma preferencia encontrada com o filtro aplicado.'
              }
            </div>
          ) : (
            <div style={{ borderColor: theme.border.secondary }}>
              {preferenciasFiltradas.map((preferencia, index) => (
                <div
                  key={preferencia.id}
                  className="py-3 px-4 transition-colors"
                  style={{
                    backgroundColor: index % 2 === 0 ? theme.background.card : theme.background.surface,
                    borderBottom: index < preferenciasFiltradas.length - 1 ? `1px solid ${theme.border.secondary}` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      {/* checkbox */}
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isPreferenciaAtiva(preferencia.id)}
                          onChange={() => togglePreferencia(preferencia.id)}
                        />
                        <div
                          className="w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all duration-200"
                          style={{
                            borderColor: isPreferenciaAtiva(preferencia.id) ? theme.brand.subHeader : (theme.mode === 'dark' ? '#4B5563' : '#888B95'),
                            backgroundColor: isPreferenciaAtiva(preferencia.id) ? theme.brand.subHeader : 'transparent',
                            boxShadow: isPreferenciaAtiva(preferencia.id) ? `0 0 0 1px ${theme.brand.subHeader}` : `0 0 0 1px ${theme.mode === 'dark' ? '#4B5563' : '#888B95'}`
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
                      <h3 className="text-sm font-medium" style={{ color: theme.text.primary }}>
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
  );
}