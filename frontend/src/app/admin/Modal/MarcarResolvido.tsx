import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ModalMarcarResolvidoProps {
  isOpen: boolean;
  onConfirm: (enviarEmail: boolean) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const ModalMarcarResolvido: React.FC<ModalMarcarResolvidoProps> = ({
  isOpen,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  const { theme, mode } = useTheme();
  const [internalLoading, setInternalLoading] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState(true);
  const loading = isLoading || internalLoading;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setInternalLoading(true);
      await onConfirm(enviarEmail);
    } catch {
      // erro tratado pelo onConfirm
    } finally {
      setInternalLoading(false);
    }
  };

  const isDark = mode === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div
        className="rounded-xl shadow-xl w-full max-w-md p-6 modalLightEnter"
        style={{ backgroundColor: theme.background.modal }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? '#14532d' : '#dcfce7' }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#16a34a' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            className="text-lg font-semibold"
            style={{ color: theme.text.primary }}
          >
            Marcar como Resolvido
          </h2>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: theme.text.secondary }}>
          Esta ação encerrará o chamado. Escolha abaixo se deseja notificar o usuário por email.
        </p>

        <label
          className="flex items-start gap-3 mb-6 cursor-pointer group select-none"
          onClick={() => !loading && setEnviarEmail(v => !v)}
        >
          <div
            className="mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors border"
            style={{
              backgroundColor: enviarEmail ? '#16a34a' : 'transparent',
              borderColor: enviarEmail ? '#16a34a' : theme.border.primary,
            }}
          >
            {enviarEmail && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <span className="text-sm font-medium block" style={{ color: theme.text.primary }}>
              Enviar email de conclusão para o usuário
            </span>
         
          </div>
        </label>

            <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isDark ? theme.background.hover : '#f3f4f6',
              color: theme.text.primary,
            }}
            onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.background.hover)}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = isDark ? theme.background.hover : '#f3f4f6')}
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-28 justify-center"
            style={{ backgroundColor: '#16a34a' }}
            onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#15803d')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#16a34a')}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              'Sim, resolver'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMarcarResolvido;
