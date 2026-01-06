'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Usuario {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

interface ModalRedirecionarChamadoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (usuarioId: number) => Promise<void>;
  chamadoId: string;
}

export default function ModalRedirecionarChamado({
  isOpen,
  onClose,
  onConfirm,
  chamadoId,
}: ModalRedirecionarChamadoProps) {
  const [usuariosAdmin, setUsuariosAdmin] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<number | null>(null);
  const [redirecionando, setRedirecionando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      carregarAdministradores();
      setUsuarioSelecionado(null);
    }
  }, [isOpen]);

  const carregarAdministradores = async () => {
    try {
      const response = await api.get('/users');
      const admins = response.data.filter((user: Usuario) => user.roleId === 1);
      setUsuariosAdmin(admins);
    } catch (error) {
      console.error('Erro ao carregar administradores:', error);
      alert('Erro ao carregar lista de administradores');
    }
  };

  const handleConfirmar = async () => {
    if (!usuarioSelecionado) {
      alert('Selecione um usuário para redirecionar');
      return;
    }

    setRedirecionando(true);
    try {
      await onConfirm(usuarioSelecionado);
      onClose();
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error('Erro ao redirecionar:', error);
    } finally {
      setRedirecionando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out', willChange: 'transform, opacity' }}
      >
        {/* Header do Modal */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white">
            Direcionar Chamado
          </h3>
          <p className="text-blue-100 text-sm mt-1">
            Selecione o administrador responsável
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body do Modal */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Administradores disponíveis
          </label>
          
          {usuariosAdmin.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Carregando administradores...
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {usuariosAdmin.map((usuario) => (
                <div
                  key={usuario.id}
                  onClick={() => setUsuarioSelecionado(usuario.id)}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer
                    transition-all duration-200
                    ${usuarioSelecionado === usuario.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                    ${usuarioSelecionado === usuario.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-700'
                    }
                  `}>
                    {usuario.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info do Usuário */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${
                      usuarioSelecionado === usuario.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {usuario.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
                  </div>

                  {/* Check Icon */}
                  {usuarioSelecionado === usuario.id && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={redirecionando}
            className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={redirecionando || !usuarioSelecionado}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {redirecionando ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redirecionando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirmar Redirecionamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
