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
      <label className="block text-sm font-medium text-primary mb-2">{label}</label>
      <div className="flex flex-wrap items-center gap-2 border border-primary rounded-lg px-2 py-1 bg-elevated min-h-11">
        {emails.map((email, idx) => (
          <span key={email} className="flex items-center bg-brand-primary/20 text-brand-primary px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1">
            {email}
            <button type="button" className="ml-1 text-brand-primary hover:text-error focus:outline-none" onClick={() => removeEmail(idx)} disabled={disabled}>&times;</button>
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
          className="flex-1 min-w-30 px-2 py-1 border-none focus:ring-0 text-primary bg-transparent outline-none"
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
    // usa classes CSS temáticas definidas em globals.css
    switch (id) {
      case 1: return 'status-badge-1';
      case 2: return 'status-badge-2';
      case 3: return 'status-badge-3';
      case 4: return 'status-badge-4';
      case 5: return 'status-badge-5';
      case 6: return 'status-badge-6';
      case 7: return 'status-badge-7';
      default: return 'bg-secondary text-primary border border-primary';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay px-4">
      <div className="modal-container rounded-2xl w-full max-w-2xl p-8 modalLightEnter border border-primary">
        <h2 className="text-2xl font-bold text-primary mb-6 font-segoe flex items-center gap-2">
          Atualização de chamado por email
        </h2>

        <EmailBadgeInput label="Destinatário(s)" emails={destinatarios} setEmails={setDestinatarios} disabled={loading} />
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCcAtivo((v) => !v)}
            className={`px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1 ${ccAtivo ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'border-primary text-secondary hover:bg-primary/10 hover:border-brand-primary'}`}
            disabled={loading}
            title="Adicionar cópia (CC)"
          >
            CC
          </button>
          <button
            type="button"
            onClick={() => setCcoAtivo((v) => !v)}
            className={`px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1 ${ccoAtivo ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'border-primary text-secondary hover:bg-primary/10 hover:border-brand-primary'}`}
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
            className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary text-primary bg-elevated resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            placeholder="Digite a mensagem ou atualização do chamado..."
          />
          <label className="flex items-center gap-2 mt-2 select-none">
            <input
              type="checkbox"
              checked={incluirTopico}
              onChange={() => setIncluirTopico((v) => !v)}
              disabled={loading}
              className="rounded border-primary text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-xs text-primary">Incluir no email o tópico do chamado</span>
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">Alterar status</label>
          <select
            value={statusSelecionado || ''}
            onChange={(e) => setStatusSelecionado(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loading}
            className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-primary bg-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            className="px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/10 hover:shadow-md transition-all font-medium text-sm whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 active:bg-brand-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-28 justify-center shadow-lg hover:shadow-xl"
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
