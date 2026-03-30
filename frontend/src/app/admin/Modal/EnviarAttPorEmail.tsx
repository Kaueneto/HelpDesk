import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

interface Status {
  id: number;
  nome: string;
}

interface ModalEnviarAttPorEmailProps {
  isOpen: boolean;
  onConfirm: (dados: {
    destinatario: string;
    mensagem: string;
    statusId?: number;
  }) => Promise<void>;
  onClose: () => void;
  usuarioEmail?: string;
  chamadoId?: string;
}

const ModalEnviarAttPorEmail: React.FC<ModalEnviarAttPorEmailProps> = ({
  isOpen,
  onConfirm,
  onClose,
  usuarioEmail = '',
  chamadoId,
}) => {
  const [destinatario, setDestinatario] = useState(usuarioEmail);
  const [mensagem, setMensagem] = useState('');
  const [statusSelecionado, setStatusSelecionado] = useState<number | undefined>();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && chamadoId) {
      carregarStatuses();
    }

    if (!isOpen) {
      setDestinatario(usuarioEmail);
      setMensagem('');
      setStatusSelecionado(undefined);
    }
  }, [isOpen, chamadoId, usuarioEmail]);

  const carregarStatuses = async () => {
    try {
      const response = await api.get('/status');
      setStatuses(response.data);
    } catch (error) {
      console.error('Erro ao carregar statuses:', error);
    }
  };

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // validações
    if (!destinatario.trim()) {
      toast.error('Por favor, preencha o campo de destinatário', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '0.875rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      return;
    }

    // validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      toast.error('Por favor, insira um email válido', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '0.875rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      return;
    }

    if (!mensagem.trim()) {
      toast.error('Por favor, preencha o corpo da mensagem', {
        style: {
          background: '#fff',
          color: '#dc2626',
          fontWeight: 'bold',
          fontSize: '0.875rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fff',
        },
      });
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      await onConfirm({
        destinatario,
        mensagem,
        statusId: statusSelecionado,
      });
      onClose();
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 modalLightEnter">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Atualização por Email</h2>
    
         <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinatário
          </label>
          <input
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="Digite o email do destinatário"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

   
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem/Atualização
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alterar status
          </label>
          <select
            value={statusSelecionado || ''}
            onChange={(e) => setStatusSelecionado(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Selecione um status (opcional)</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.nome}
              </option>
            ))}
           </select>
        </div>

        
         <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-24 justify-center"
          >
            {loading ? (
              <>
                <div className="spinnerSoft h-4 w-4 border-2 border-white border-t-transparent rounded-full -ml-1 mr-2"></div>
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEnviarAttPorEmail;
