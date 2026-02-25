'use client';

import { useState, useEffect, useContext } from 'react';
import api from '@/services/api';
import { AuthContext } from '@/contexts/AuthContext';

interface Preferencia {
  id: number;
  descricao: string;
}

export default function GerenciarPreferencias() {
  const { user } = useContext(AuthContext);

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
      console.error('Erro ao carregar preferências:', error);
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
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    
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
      console.error('Erro ao atualizar preferencia:', error);
      alert('Erro ao atualizar preferencia');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-left items-left h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando...</span>
      </div>
    );
  }

  return (
  <div className="p-5 min-h-screen bg-[#fffafa] ">
    <div className="max-w-4xl">
      {/* Header */}
      <div className="py-2 mb-2 ">
        <h1 className="text-xl font-bold text-gray-900">
          Minhas Preferências
        </h1>
      </div>

      {/* Filtro */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar preferências..."
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {preferenciasFiltradas.length} preferencia{preferenciasFiltradas.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div>
        {preferenciasFiltradas.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            {preferencias.length === 0
              ? 'Nenhuma preferencia cadastrada no sistema.'
              : 'Nenhuma preferencia encontrada com o filtro aplicado.'
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {preferenciasFiltradas.map((preferencia) => (
              <div
                key={preferencia.id}
                className="py-2 px-1 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    {/* checkbox — NÃO MEXI */}
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isPreferenciaAtiva(preferencia.id)}
                        onChange={() => togglePreferencia(preferencia.id)}
                      />
                      <div className={`
                        w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all duration-200
                        ${isPreferenciaAtiva(preferencia.id) 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'border-gray-300 hover:border-blue-400'
                        }
                      `}>
                        {isPreferenciaAtiva(preferencia.id) && (
                          <svg 
                            className="w-4 h-4" 
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
                    <h3 className="text-sm font-medium text-gray-900">
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