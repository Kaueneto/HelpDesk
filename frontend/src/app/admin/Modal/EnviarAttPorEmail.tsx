import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

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

function EmailBadgeInput({ label, emails, setEmails, disabled, theme }: { label: string, emails: string[], setEmails: (v: string[]) => void, disabled?: boolean, theme: any }) {
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
      <label className="block text-sm font-medium mb-2" style={{ color: theme.modalEnviarEmail.textPrimary }}>{label}</label>
      
      {/* Badges dos emails inseridos */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {emails.map((email, idx) => (
            <span key={email} className="flex items-center px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.modalEnviarEmail.badge.bg, color: theme.modalEnviarEmail.badge.text }}>
              {email}
              <button type="button" className="ml-2 hover:opacity-80 focus:outline-none font-bold" onClick={() => removeEmail(idx)} disabled={disabled} style={{ color: theme.modalEnviarEmail.badge.text }}>&times;</button>
            </span>
          ))}
        </div>
      )}
      
      {/* Campo de input */}
      <div className="border rounded-lg px-3 py-2" style={{ borderColor: theme.modalEnviarEmail.border, backgroundColor: theme.modalEnviarEmail.input.bg }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full border-none focus:ring-0 outline-none"
          placeholder="Digite e pressione Enter"
          style={{ color: theme.modalEnviarEmail.input.text, backgroundColor: theme.modalEnviarEmail.input.bg }}
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
  const { theme } = useTheme();
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

  // funcao para retornar cores vibrantes baseadas no status
  function getStatusColors(id?: number) {
    switch (id) {
      case 1: // aberto - amarelo
        return { bg: 'rgba(201, 194, 0, 0.15)', text: '#FFFFFF', border: '#C9C200' };
      case 2: // em análise/em andamento - azul
        return { bg: 'rgba(21, 93, 252, 0.15)', text: '#FFFFFF', border: '#155DFC' };
      case 3: // concluído/finalizado - verde
        return { bg: 'rgba(27, 230, 0, 0.15)', text: '#FFFFFF', border: '#1BE600' };
      case 4: // atrasado - vermelho
        return { bg: 'rgba(231, 76, 60, 0.15)', text: '#FFFFFF', border: '#E74C3C' };
      case 5: // reaberto - azul
        return { bg: 'rgba(21, 93, 252, 0.15)', text: '#FFFFFF', border: '#155DFC' };
      case 6: // pendente usuário - roxo
        return { bg: 'rgba(148, 0, 255, 0.15)', text: '#FFFFFF', border: '#9400FF' };
      case 7: // pendente terceiros - laranja
        return { bg: 'rgba(254, 154, 0, 0.15)', text: '#FFFFFF', border: '#FE9A00' };
      default:
        return { bg: 'rgba(71, 85, 105, 0.15)', text: '#F1F5F9', border: '#475569' };
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
    <div   className="fixed inset-0 flex items-center justify-center z-50 px-4 bg-black/50">
      <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] border flex flex-col" style={{ backgroundColor: theme.modalEnviarEmail.background, borderColor: theme.modalEnviarEmail.border }}>
        {/* Header */}
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold mb-0 font-segoe flex items-center gap-2" style={{ color: theme.modalEnviarEmail.textPrimary }}>
            Atualização de chamado por email
          </h2>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto px-8">
          <EmailBadgeInput label="Destinatário(s)" emails={destinatarios} setEmails={setDestinatarios} disabled={loading} theme={theme} />
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCcAtivo((v) => !v)}
              className="px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1"
              style={{
                borderColor: ccAtivo ? theme.brand.primary : theme.modalEnviarEmail.border,
                backgroundColor: ccAtivo ? `${theme.brand.primary}20` : 'transparent',
                color: ccAtivo ? theme.brand.primary : theme.modalEnviarEmail.textSecondary
              }}
              disabled={loading}
              title="Adicionar cópia (CC)"
            >
              CC
            </button>
            <button
              type="button"
              onClick={() => setCcoAtivo((v) => !v)}
              className="px-3 py-2 border rounded-lg font-medium text-xs transition-all duration-150 flex items-center gap-1"
              style={{
                borderColor: ccoAtivo ? theme.brand.primary : theme.modalEnviarEmail.border,
                backgroundColor: ccoAtivo ? `${theme.brand.primary}20` : 'transparent',
                color: ccoAtivo ? theme.brand.primary : theme.modalEnviarEmail.textSecondary
              }}
              disabled={loading}
              title="Adicionar cópia oculta (CCO)"
            >
              CCO
            </button>
          </div>

          {ccAtivo && (
            <EmailBadgeInput label="Cópia (CC)" emails={ccs} setEmails={setCcs} disabled={loading} theme={theme} />
          )}

          {ccoAtivo && (
            <EmailBadgeInput label="Cópia Oculta (CCO)" emails={ccos} setEmails={setCcos} disabled={loading} theme={theme} />
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.modalEnviarEmail.textPrimary }}>Mensagem/Atualização</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={5}
              disabled={loading}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                borderColor: theme.modalEnviarEmail.border,
                backgroundColor: theme.modalEnviarEmail.input.bg,
                color: theme.modalEnviarEmail.input.text
              }}
              placeholder="Digite a mensagem ou atualização do chamado..."
            />
            <label className="flex items-center gap-2 mt-2 select-none">
              <input
                type="checkbox"
                checked={incluirTopico}
                onChange={() => setIncluirTopico((v) => !v)}
                disabled={loading}
                className="rounded border"
                style={{ borderColor: theme.modalEnviarEmail.border }}
              />
              <span className="text-xs" style={{ color: theme.modalEnviarEmail.textPrimary }}>Incluir no email o tópico do chamado</span>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.modalEnviarEmail.textPrimary }}>Alterar status</label>
            <div className="relative">
              <select
                value={statusSelecionado || ''}
                onChange={(e) => setStatusSelecionado(e.target.value ? Number(e.target.value) : undefined)}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none pr-10"
                style={{
                  borderColor: theme.modalEnviarEmail.border,
                  backgroundColor: theme.modalEnviarEmail.input.bg,
                  color: theme.modalEnviarEmail.input.text,
                  colorScheme: 'dark'
                }}
              >
              <option value="">Selecione um status (opcional)</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.nome}
                </option>
              ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: theme.modalEnviarEmail.input.text }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            {statusSelecionado && (
              <div className="mt-3 flex items-start gap-3">
                <div 
                  className="flex-1 text-sm px-3 py-2 rounded-lg border animate-fadeIn font-medium" 
                  style={{ 
                    backgroundColor: getStatusColors(statusSelecionado).bg, 
                    color: getStatusColors(statusSelecionado).text, 
                    borderColor: getStatusColors(statusSelecionado).border 
                  }}
                >
                  {getDescricaoStatus(statusSelecionado)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-between mt-6 p-8 pt-4 border-t" style={{ borderColor: theme.modalEnviarEmail.border }}>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg transition-all font-medium text-sm whitespace-nowrap"
            style={{
              borderColor: theme.modalEnviarEmail.button.secondary.border,
              color: theme.modalEnviarEmail.button.secondary.text,
              backgroundColor: theme.modalEnviarEmail.button.secondary.bg
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.secondary.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.secondary.bg}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg flex items-center gap-2 min-w-28 justify-center shadow-lg transition-all"
            style={{
              backgroundColor: theme.modalEnviarEmail.button.primary.bg
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.primary.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.modalEnviarEmail.button.primary.bg}
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
