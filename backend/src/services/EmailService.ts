


import nodemailer from "nodemailer";
import { AppDataSource } from "../data-source";
import { Users } from "../entities/Users";
import { Chamados } from "../entities/Chamados";
import { PrefUsers } from "../entities/PrefUsers";

//enviar atualizacao de chamado por email 
export async function enviarAtualizacaoChamadoPorEmail({ chamado, usuario, destinatario, mensagem, nomeRemetente, cc, cco, incluirTopico }: {
  chamado: any,
  usuario: any,
  destinatario: string,
  mensagem: string,
  nomeRemetente: string,
  cc?: string,
  cco?: string,
  incluirTopico?: boolean,
}) {
  try {
    const transporter = require('nodemailer').createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
const mailOptions: any = {
  from: process.env.EMAIL_FROM,
  to: destinatario,
  subject: `Atualização no Ticket #${chamado.numeroChamado} - ${chamado.resumoChamado}`,
  html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f6f8;">
  <div style="background-color: #ffffff; padding: 24px 28px; border-radius: 8px; border: 1px solid #e5e7eb;">
    
    <!-- TÍTULO -->
    <h2 style="color: #2563eb; margin-bottom: 16px;">
      Atualização no Ticket #${chamado.numeroChamado}
    </h2>

    <p style="font-size: 14px; color: #111; margin-bottom: 14px;">
      <strong>Assunto:</strong> ${chamado.resumoChamado}
    </p>

    <!-- MENSAGEM -->
    <div style="margin-bottom: 20px;">
      <p style="font-size: 13px; color: #555; margin-bottom: 6px;">
        <strong>${nomeRemetente} comentou:</strong>
      </p>

      <div style="font-size: 14px; color: #111; line-height: 1.5; background-color: #f4f6f8; padding: 12px; border-radius: 4px;">
        ${mensagem.replace(/\n/g, '<br>')}
      </div>
    </div>

    <!-- STATUS (DEPOIS DA MENSAGEM) -->
    <div style="background-color: #f4f6f8; padding: 14px 16px; border-radius: 6px; border-left: 4px solid ${chamado.status?.cor || '#2563eb'}; margin-bottom: 20px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #555;">
        <strong>Status atual:</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #111; font-weight: 500;">
        ${(() => {
          switch (chamado.status?.id) {
            case 1:
              return 'Recebemos sua solicitação e vamos analisar em breve.';
            case 2:
              return 'Estamos trabalhando na sua solicitação.';
            case 3:
              return 'Sua solicitação foi concluída.';
            case 4:
              return 'Encontramos um problema, mas seguimos trabalhando na solução.';
            case 5:
              return 'O atendimento foi retomado.';
            case 6:
              return 'Estamos aguardando seu retorno para continuar.';
            case 7:
              return 'No momento, depende de outra área. Estamos acompanhando.';
            default:
              return chamado.status?.nome || '';
          }
        })()}
      </p>
    </div>

    <!-- DETALHES -->
    <div style="margin-bottom: 20px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #555;">
        <strong>Número do ticket:</strong> #${chamado.numeroChamado}
      </p>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #555;">
        <strong>Data de abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}
      </p>
      ${incluirTopico ? `<p style="margin: 0; font-size: 13px; color: #555;"><strong>Tópico de assunto:</strong> ${chamado.topicoAjuda?.nome || chamado.topico?.nome}</p>` : ''}
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #777; margin: 0;">
      Este e-mail é apenas informativo, não responda.
    </p>

  </div>
</div>
`
    };
    if (cc) mailOptions.cc = cc;
    if (cco) mailOptions.bcc = cco;
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erro ao enviar email de atualização:', error);
    // lançar o  erro para o controller capturar e retornar ao frontend
    throw new Error('Falha ao enviar email. Verifique os destinatários e tente novamente.');
  }
}

//  verificar preferencias do usuário
export async function verificarPreferenciasUsuario(userId: number): Promise<number[]> {
  try {
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);
    const preferencias = await prefUsersRepository.find({
      where: { user_id: userId },
      select: ["preferencia_id"]
    });
    return preferencias.map(pref => pref.preferencia_id);
  } catch (error) {
    return [];
  }
}

//  enviar email quando o chamado está aguardando resposta do usuário
export async function enviarEmailEsperandoUsuario(usuario: Users, chamado: Chamados): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: usuario.email,
      subject: `Chamado #${chamado.numeroChamado} - Aguardando sua resposta`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <h2 style="color: #f39c12; margin-bottom: 20px; text-align: center;">
          Seu chamado está aguardando sua resposta
        </h2>

        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Olá, <strong>${usuario.name}</strong>.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          O chamado com o assunto <strong>"${chamado.resumoChamado}"</strong> está aguardando sua resposta para que possamos continuar o atendimento.
        </p>

        <div style="background-color: #fff4e5; padding: 20px; border-radius: 8px; border-left: 4px solid #f39c12; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Número do chamado:</strong> #${chamado.numeroChamado}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Status:</strong> 
            <span style="color: #f39c12; font-weight: bold;">
              Aguardando resposta do usuário
            </span>
          </p>
        </div>

        <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
          Por favor, acesse o sistema para visualizar a mensagem enviada pela equipe de suporte e responder ao chamado.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
          Este é um email automático, não responda.
        </p>

      </div>
    </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Falha silenciosa - email não deve bloquear operações
  }
}

//  enviar email quando o chamado está aguardando retorno de terceiros
export async function enviarEmailAguardandoTerceiros(usuario: Users, chamado: Chamados): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: usuario.email,
      subject: `Chamado #${chamado.numeroChamado} - Aguardando retorno de outro setor`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <h2 style="color: #6c757d; margin-bottom: 20px; text-align: center;">
          Seu chamado está aguardando retorno de outro setor
        </h2>

        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Olá, <strong>${usuario.name}</strong>.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          O chamado com o assunto <strong>"${chamado.resumoChamado}"</strong> foi encaminhado para o responsável e no momento estamos aguardando um retorno para dar continuidade na sua solicitação.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
          Assim que tivermos um retorno, o atendimento será retomado automaticamente.
        </p>

        <div style="background-color: #f1f3f5; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Número do chamado:</strong> #${chamado.numeroChamado}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Status:</strong> 
            <span style="color: #6c757d; font-weight: bold;">
              Aguardando retorno de outro setor
            </span>
          </p>
        </div>

        <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
          Você pode acompanhar o andamento do chamado através da aba 
          <strong>"Acompanhar Chamados"</strong> no sistema.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
          Este é um email automático, não responda.
        </p>

      </div>
    </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Falha silenciosa - email não deve bloquear operações
  }
}

//  email de notificação para administradores sobre novo chamado
export async function enviarEmailNotificacaoAdmin(admin: Users, usuario: Users, chamado: Chamados): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: admin.email,
      subject: `Novo Chamado #${chamado.numeroChamado} - ${usuario.name}`,
      html: `
        <h2>Novo Chamado Aberto!</h2>
        <p>Olá <strong>${admin.name}</strong>,</p>
        <p>Um novo chamado foi aberto no sistema com os seguintes detalhes:</p>
       <div style="background-color: #e9f7ef; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 25px;">
              <h3 style="color: #1e7e34; margin-top: 0; margin-bottom: 15px;">Detalhes do Chamado:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;"><strong>Número:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 10px;"><strong>Status:</strong> <span style="color: #f39c12; font-weight: bold;">Aberto</span></li>
              </ul>
            </div>
        <p>Por favor, acesse o sistema para atender esta solicitação.</p>
        <p><br><strong>Sistema HelpDesk</strong></p>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Falha silenciosa - email não deve bloquear operações
  }
}

//  enviar email de confirmação para o usuário que abriu o chamado
export async function enviarEmailConfirmacaoUsuario(usuario: Users, chamado: Chamados): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: usuario.email,
      subject: `Chamado #${chamado.numeroChamado} - Aberto com sucesso`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-bottom: 20px; text-align: center;">Chamado Aberto com Sucesso!</h2>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${usuario.name}</strong>,</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
              Seu chamado foi registrado com sucesso, sua solicitação será analisada e entraremos em contato em breve se for necessário.
            </p>
            
            <div style="background-color: #e9f7ef; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 25px;">
              <h3 style="color: #1e7e34; margin-top: 0; margin-bottom: 15px;">Detalhes do Chamado:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;"><strong>Número do ticket:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 10px;"><strong>Status atual:</strong> <span style="color: #f39c12; font-weight: bold;">Aberto</span></li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
            Acompanhe seu chamado através da aba "Acompanhar Chamados" no sistema. Você será notificado quando ele for concluído.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
              Este é um email automático, não responda.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Falha silenciosa - email não deve bloquear operações
  }
}

//  enviar email quando um chamado é redirecionado para outro responsável
export async function enviarEmailRedirecionamento(
  novoResponsavel: Users | null, 
  usuarioQueRedirecionou: Users | null, 
  chamado: Chamados
): Promise<void> {
  // verificar se todos os parametros necessarios estão presentes
  if (!novoResponsavel || !usuarioQueRedirecionou) {
    return; // sair silenciosamente se não há usuários
  }

  // verificar se é autoatribuição (mesmo usuário)
  if (novoResponsavel.id === usuarioQueRedirecionou.id) {
    return; // Não enviar email para si mesmo
  }

  // verificar se o email do destinatário existe
  if (!novoResponsavel.email) {
    return; // nao pode enviar email sem destinatário
  }

  try {
    // verificar se as variáveis de ambiente estão configuradas
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // testar conexão do transporter
    try {
      await transporter.verify();
    } catch (verifyError) {
      throw new Error('Falha na conexão SMTP');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: novoResponsavel.email,
      subject: `Chamado #${chamado.numeroChamado} direcionado para você por ${usuarioQueRedirecionou.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #007bff; margin-bottom: 20px; text-align: center;">Chamado Redirecionado</h2>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${novoResponsavel.name}</strong>,</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
              O chamado <strong>#${chamado.numeroChamado}</strong> foi redirecionado para você por <strong>${usuarioQueRedirecionou.name}</strong>. 
              Você agora é o responsável pelo atendimento deste chamado.
            </p>
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin-bottom: 25px;">
              <h3 style="color: #1565c0; margin-top: 0; margin-bottom: 15px;">📋 Detalhes do Chamado:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;"><strong>Número:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 8px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 8px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: #f57c00; font-weight: bold;">Em Atendimento</span></li>
                <li style="margin-bottom: 8px;"><strong>Redirecionado por:</strong> ${usuarioQueRedirecionou.name}</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 25px;">
             <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚡ Ação Necessária:</strong> Acesse o sistema HelpDesk para visualizar todos os detalhes e iniciar o atendimento.
            </p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
              <strong>Sistema HelpDesk</strong><br>
            Este é um email automático, não responda.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // não lançar o erro de email pois ele não deve interromper as operações
    console.error("Erro ao enviar email de redirecionamento:", error);
  }
}

// enviar email de conclusao pro usuario
export async function enviarEmailConclusaoUsuario(
  usuario: Users, 
  chamado: Chamados, 
  adminResponsavel: Users | null
): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const nomeResponsavel = adminResponsavel?.name || "Nossa equipe";
    const dataFechamento = chamado.dataFechamento 
      ? new Date(chamado.dataFechamento).toLocaleString('pt-BR') 
      : "N/A";
        
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: usuario.email,
      subject: `✓ Chamado #${chamado.numeroChamado} - Concluído`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-bottom: 20px; text-align: center;">✓ Chamado Concluído!</h2>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${usuario.name}</strong>,</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
              Informamos que o atendimento referente ao seu chamado foi concluído com sucesso! 
            </p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 25px;">
              <h3 style="color: #155724; margin-top: 0; margin-bottom: 15px;">Resumo do Atendimento:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;"><strong>Número:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Responsável:</strong> ${nomeResponsavel}</li>
                <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 10px;"><strong>✓ Data de Conclusão:</strong> ${dataFechamento}</li>
              </ul>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin-bottom: 25px;">
              <p style="margin: 0; color: #0c5460; font-size: 14px;">
                <strong>💬 Feedback:</strong> Sua opinião é importante para nós! Se precisar de mais alguma coisa, não hesite em abrir um novo chamado.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
              Estamos sempre disponíveis para ajudá-lo!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
              <br>
              <strong>Equipe HelpDesk</strong><br>
              Este é um email automático, não responda.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Falha silenciosa - email não deve bloquear operações
  }
}

//funcao pra enviar email quando um admin cria um chamado e atribui a um responsavel
export async function enviarEmailChamadoCriadoPorAdmin(
  responsavel: Users,
  adminCriador: Users,
  chamado: Chamados
): Promise<void> {

  if (!responsavel || !adminCriador || !chamado) {
    return;
  }

  // verificar  se é o mesmo usuário (admin criando para si mesmo)
  if (responsavel.id === adminCriador.id) {
    return; // nao enviar email para si mesmo
  }

  // verificar se o email do destinatário existe
  if (!responsavel.email) {
    return;
  }

  try {
    // verificar se as variáveis de ambiente estão configuradas
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: responsavel.email,
      subject: `Novo Chamado #${chamado.numeroChamado} atribuído a você`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #007bff; margin-bottom: 20px; text-align: center;">Novo Chamado Atribuído</h2>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${responsavel.name}</strong>,</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
              <strong>${adminCriador.name}</strong> abriu um novo chamado e atribuiu o atendimento para você.
            </p>
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin-bottom: 25px;">
              <h3 style="color: #1565c0; margin-top: 0; margin-bottom: 15px;">Detalhes do Chamado:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;"><strong>Número:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Descrição:</strong> ${chamado.descricaoChamado || 'Não informada'}</li>
                <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 10px;"><strong>Criado por:</strong> ${adminCriador.name}</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 25px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚡ Ação Necessária:</strong> Acesse o sistema HelpDesk para visualizar todos os detalhes e iniciar o atendimento.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
              <strong>Sistema HelpDesk</strong><br>
              Este é um email automático, não responda.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // nao lançar o erro de email pois ele não deve interromper as operações
    console.error("Erro ao enviar email de chamado criado por admin:", error);
  }
}


