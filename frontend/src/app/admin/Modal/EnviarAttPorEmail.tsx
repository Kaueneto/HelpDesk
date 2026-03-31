import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

interface Status {
  id: number;
  nome: string;
}

interface ModalEnviarAttPorEmailProps {
  isOpen: boolean;
  onConfirm: (dados: {
    destinatario: string; // pode ser múltiplos meails separados por vírgula
    mensagem: string;
    statusId?: number;
    cc?: string; // pode ser múltiplos meails separados por vírgula
    cco?: string; // pode ser múltiplos meails separados por vírgula
    incluirTopico?: boolean;
  }) => Promise<void>;
  onClose: () => void;
  usuarioEmail?: string;
  chamadoId?: string;
}

function EmailBadgeInput({ label, emails, setEmails, disabled }: { label: string, emails: string[], setEmails: (v: string[]) => void, disabled?: boolean }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function addEmail(val: string) {
    const parts = val.split(',').map(e => e.trim()).filter(Boolean);
    let added = false;
    parts.forEach(email => {
      if (emailRegex.test(email) && !emails.includes(email)) {
        setEmails([...emails, email]);
        added = true;
      }
    });
    if (added) setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  }

  function handleBlur() {
    addEmail(input);
  }

  function removeEmail(idx: number) {
    setEmails(emails.filter((_, i) => i !== idx));
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 bg-white min-h-11">
        {emails.map((email, idx) => (
          <span key={email} className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1">
            {email}
            <button type="button" className="ml-1 text-blue-500 hover:text-red-500 focus:outline-none" onClick={() => removeEmail(idx)} disabled={disabled}>&times;</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          className="flex-1 min-w-30 px-2 py-1 border-none focus:ring-0 text-gray-900 bg-transparent outline-none"
          placeholder="Digite e pressione Enter"
        />
      </div>
    </div>
  );
}

const ModalEnviarAttPorEmail: React.FC<ModalEnviarAttPorEmailProps> = ({
  isOpen,
  onConfirm,
  onClose,
  usuarioEmail = '',
  chamadoId,
}) => {
  const [destinatarios, setDestinatarios] = useState<string[]>(usuarioEmail ? [usuarioEmail] : []);
  const [ccAtivo, setCcAtivo] = useState(false);
  const [ccoAtivo, setCcoAtivo] = useState(false);
  const [ccs, setCcs] = useState<string[]>([]);
  const [ccos, setCcos] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [incluirTopico, setIncluirTopico] = useState(false);
  const [statusSelecionado, setStatusSelecionado] = useState<number | undefined>(undefined);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    async function initModal() {
      if (isOpen && chamadoId) {
        await carregarStatus();
        // buscar status atual do chamado
        try {
          const resp = await api.get(`/chamados/${chamadoId}`);
          if (resp.data && resp.data.status && resp.data.status.id) {
            setStatusSelecionado(resp.data.status.id);
          } else {
            setStatusSelecionado(undefined);
          }
        } catch (err) {
          setStatusSelecionado(undefined);
        }
      }
      if (!isOpen) {
        setDestinatarios(usuarioEmail ? [usuarioEmail] : []);
        setMensagem('');
        setStatusSelecionado(undefined);
        setCcs([]);
        setCcos([]);
        setCcAtivo(false);
        setCcoAtivo(false);
      }
    }
    initModal();
  }, [isOpen, chamadoId, usuarioEmail]);

  // quando carregar os statuses, define o status atual do chamado como selecionado
  useEffect(() => {
    if (statuses.length > 0 && statusSelecionado === undefined && isOpen) {
      setStatusSelecionado(statuses[0]?.id);
    }
  }, [statuses, isOpen]);

  // funcoes para mensagens de status
  function getMensagemStatusAberto() {
    return 'Sua solicitação foi registrada e será analisada em breve.';
  }
  function getMensagemStatusEmAnalise() {
    return 'Sua solicitação já está em verificação e segue em andamento.';
  }
  function getMensagemStatusConcluido() {
    return 'Sua solicitação foi concluída. Se algo não estiver certo, é só avisar.';
  }
  function getMensagemStatusAtrasado() {
    return 'Houve um imprevisto na resolução desta solicitação, mas ela segue em andamento.';
  }
  function getMensagemStatusReaberto() {
    return 'A solicitação foi reaberta para continuidade do atendimento.';
  }
  function getMensagemStatusPendenteUsuario() {
    return 'Aguardando seu retorno para dar continuidade à solicitação.';
  }
  function getMensagemStatusPendenteTerceiros() {
  return 'A solicitação depende de outra área no momento e segue em acompanhamento.';
  }

  // funcao para obter a mensagem de acordo com o status selecionado
  function getDescricaoStatus(id?: number): string | null {
    switch (id) {
      case 1: // aberto
        return getMensagemStatusAberto();
      case 2: // em análise
        return getMensagemStatusEmAnalise();
      case 3: // concluído
        return getMensagemStatusConcluido();
      case 4: // atrasado 
        return getMensagemStatusAtrasado();
      case 5: // reaberto
        return getMensagemStatusReaberto();
      case 6: // pendente usuário
        return getMensagemStatusPendenteUsuario();
      case 7: // pendente terceiros
        return getMensagemStatusPendenteTerceiros();
      default:
        return null;
    }
  }

  // funcao para retornar classes de cor para cada status
  function getStatusColorClass(id?: number, badge = false): string {
    // badge: se true, retorna classes para o span, senão para o select
    switch (id) {
      case 1: // aberto
        return badge ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-blue-50 text-blue-700 border-blue-200';
      case 2: // em análise
        return badge ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-yellow-50 text-yellow-800 border-yellow-300';
      case 3: // concluído
        return badge ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-green-50 text-green-700 border-green-200';
      case 4: // atrasado
        return badge ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-red-50 text-red-700 border-red-200';
      case 5: // reaberto
        return badge ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 6: // pendente usuário
        return badge ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-orange-50 text-orange-700 border-orange-200';
      case 7: // pendente terceiros
        return badge ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return badge ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  const carregarStatus = async () => {
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

    if (destinatarios.length === 0) {
      toast.error('Por favor, insira ao menos um email válido para destinatário.', {
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
        destinatario: destinatarios.join(','),
        mensagem,
        statusId: statusSelecionado,
        cc: ccs.length > 0 ? ccs.join(',') : undefined,
        cco: ccos.length > 0 ? ccos.join(',') : undefined,
        incluirTopico
      });
      onClose();
    } catch (error) {
      // erro silencioso
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 modalLightEnter border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 font-segoe flex items-center gap-2">
          Atualização de chamado por email
        </h2>

        <EmailBadgeInput label="Destinatário(s)" emails={destinatarios} setEmails={setDestinatarios} disabled={loading} />
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCcAtivo((v) => !v)}
            className={`px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1 ${ccAtivo ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-blue-400'}`}
            disabled={loading}
            title="Adicionar cópia (CC)"
          >
            CC
          </button>
          <button
            type="button"
            onClick={() => setCcoAtivo((v) => !v)}
            className={`px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1 ${ccoAtivo ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-blue-400'}`}
            disabled={loading}
            title="Adicionar cópia oculta (CCO)"
          >
            CCO
          </button>
        </div>

        {ccAtivo && (
          <EmailBadgeInput label="Cópia (CC)" emails={ccs} setEmails={setCcs} disabled={loading} />
        )}

        {ccoAtivo && (
          <EmailBadgeInput label="Cópia Oculta (CCO)" emails={ccos} setEmails={setCcos} disabled={loading} />
        )}


        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem/Atualização</label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
            placeholder="Digite a mensagem ou atualização do chamado..."
          />
          <label className="flex items-center gap-2 mt-2 select-none">
            <input
              type="checkbox"
              checked={incluirTopico}
              onChange={() => setIncluirTopico((v) => !v)}
              disabled={loading}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">Incluir no email o tópico do chamado</span>
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Alterar status</label>
          <select
            value={statusSelecionado || ''}
            onChange={(e) => setStatusSelecionado(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          >
            <option value="">Selecione um status (opcional)</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.nome}
              </option>
            ))}
          </select>
          {statusSelecionado && (
            <div className="mt-3 flex items-start gap-3">

              <div className={`flex-1 text-sm px-3 py-2 rounded-lg animate-fadeIn border ${getStatusColorClass(statusSelecionado, true)}`}>
                {getDescricaoStatus(statusSelecionado)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-between mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-100 transition-all font-medium text-sm whitespace-nowrap shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-28 justify-center shadow-md"
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
