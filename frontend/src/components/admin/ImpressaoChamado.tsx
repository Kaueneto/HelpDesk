'use client';

import React from 'react';

interface Anexo {
  id: number;
  filename: string;
  url: string;
  signedUrl?: string | null;
  criadoEm: string;
}

interface Mensagem {
  id: number;
  mensagem: string;
  dataEnvio: string;
  usuario: {
    id: number;
    name: string;
  };
  anexos?: Anexo[];
}

interface Historico {
  id: number;
  acao: string;
  dataMov: string;
  usuario: {
    id: number;
    name: string;
  };
}

interface Chamado {
  id: number;
  numeroChamado: number;
  resumoChamado: string;
  descricaoChamado: string;
  ramal: number;
  dataAbertura: string;
  dataFechamento: string | null;
  dataAtribuicao: string | null;
  usuario: {
    id: number;
    name: string;
    email: string;
  };
  userResponsavel: {
    id: number;
    name: string;
  } | null;
  userFechamento: {
    id: number;
    name: string;
  } | null;
  tipoPrioridade: {
    id: number;
    nome: string;
    cor: string;
  };
  departamento: {
    id: number;
    name: string;
  };
  topicoAjuda: {
    id: number;
    nome: string;
  };
  status: {
    id: number;
    nome: string;
  };
  anexos?: Anexo[];
  vezesreaberto: number;
}

interface ImpressaoChamadoProps {
  chamado: Chamado;
  mensagens: Mensagem[];
  historicos: Historico[];
  incluirConversa: boolean;
  incluirHistorico: boolean;
}

export default function ImpressaoChamado({
  chamado,
  mensagens,
  historicos,
  incluirConversa,
  incluirHistorico,
}: ImpressaoChamadoProps) {
  const formatarData = (data: string) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (data: string) => {
    const date = new Date(data);
    const dataFormatada = date.toLocaleDateString('pt-BR');
    const horaFormatada = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dataFormatada} às ${horaFormatada}`;
  };

  return (
    <html>
      <head>
        <title>Impressão - Chamado #{chamado.numeroChamado}</title>
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 10cm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 20px;
            max-width: 21cm;
            margin: 0 auto;
            background: white;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 50px;
          }
          
          .logo {
            width: 150px;
            height: auto;
          }
          
          .title-section {
            flex: 1;
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #001933;
            margin-bottom: 5px;
          }
          
          .numero-chamado {
            color: #666;
            font-size: 14px;
            margin-bottom: 15px;
          }
          
          .divider {
            border: 0;
            border-top: 2px solid #001933;
            margin: 20px 0;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px 20px;
            margin-bottom: 20px;
          }
          
          .info-label {
            font-weight: bold;
            gap: 5px;
            color: #001933;
          }
          
          .info-value {
            color: #333;
          }
          
          .section {
            margin-top: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #001933;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          .descricao {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #001933;
            margin-bottom: 20px;
            white-space: pre-wrap;
          }
          
          .mensagem {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 15px;
            border-left: 3px solid #1A68CF;
          }
          
          .mensagem-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
          }
          
          .mensagem-usuario {
            font-weight: bold;
            color: #001933;
          }
          
          .mensagem-data {
            color: #666;
          }
          
          .mensagem-texto {
            color: #333;
            white-space: pre-wrap;
          }
          
          .historico-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
          }
          
          .historico-item:last-child {
            border-bottom: none;
          }
          
          .historico-acao {
            color: #333;
            flex: 1;
          }
          
          .historico-info {
            text-align: right;
            font-size: 12px;
            color: #666;
          }
          
          .historico-usuario {
            font-weight: 500;
            color: #001933;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div className="title-section">
            <div className="title">{chamado.resumoChamado}</div>
            <div className="numero-chamado">#{chamado.numeroChamado}</div>
          </div>
          <img src="/logo-empresa.png" alt="Logo da Empresa" className="logo" />
        </div>

        <hr className="divider" />

        <div className="info-grid">
          <span className="info-label">Tópico:</span>
          <span className="info-value">{chamado.topicoAjuda.nome}</span>

          <span className="info-label">Usuário:</span>
          <span className="info-value">{chamado.usuario.name}</span>

          <span className="info-label">Departamento:</span>
          <span className="info-value">{chamado.departamento.name}</span>

          <span className="info-label">Data de Solicitação:</span>
          <span className="info-value">{formatarDataHora(chamado.dataAbertura)}</span>

          <span className="info-label">Data de Conclusão:</span>
          <span className="info-value">
            {chamado.dataFechamento ? formatarDataHora(chamado.dataFechamento) : 'Em andamento'}
          </span>

          <span className="info-label">Status:</span>
          <span className="info-value">{chamado.status.nome}</span>

          <span className="info-label">Prioridade:</span>
          <span className="info-value">{chamado.tipoPrioridade.nome}</span>
        </div>

        <div className="section">
          <div className="section-title">Descrição</div>
          <div className="descricao">{chamado.descricaoChamado}</div>
        </div>

        {incluirConversa && mensagens.length > 0 && (
          <div className="section">
            <div className="section-title">Conversa do Chamado</div>
            {mensagens.map((mensagem) => (
              <div key={mensagem.id} className="mensagem">
                <div className="mensagem-header">
                  <span className="mensagem-usuario">{mensagem.usuario.name}</span>
                  <span className="mensagem-data">{formatarDataHora(mensagem.dataEnvio)}</span>
                </div>
                <div className="mensagem-texto">{mensagem.mensagem}</div>
              </div>
            ))}
          </div>
        )}

        {incluirHistorico && historicos.length > 0 && (
          <div className="section">
            <div className="section-title">Histórico do Chamado</div>
            {historicos.map((historico) => (
              <div key={historico.id} className="historico-item">
                <div className="historico-acao">{historico.acao}</div>
                <div className="historico-info">
                  <div className="historico-usuario">{historico.usuario.name}</div>
                  <div>{formatarDataHora(historico.dataMov)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <script>{`
          window.onload = function() {
            window.print();
          };
        `}</script>
      </body>
    </html>
  );
}
