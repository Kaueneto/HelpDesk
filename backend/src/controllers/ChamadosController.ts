import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Chamados } from "../entities/Chamados";
import { ChamadoHistorico } from "../entities/ChamadoHistorico";
import { ChamadoMensagens } from "../entities/ChamadoMensagens";
import { ChamadoAnexos } from "../entities/ChamadoAnexos";
import { Users } from "../entities/Users";
import { StatusChamado } from "../entities/StatusChamado";
import { TipoPrioridade } from "../entities/TipoPrioridade";
import { Departamentos } from "../entities/Departamentos";
import { PrefUsers } from "../entities/PrefUsers";
import nodemailer from "nodemailer";
import { TopicosAjuda } from "../entities/TopicosAjuda";
import { ParametrosSistema } from "../entities/ParametrosSistema";
import { verifyToken } from "../Middleware/AuthMiddleware";
import { supabase, SUPABASE_BUCKET } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRoleId?: number;
}

const router = Router();

// funcao para verificar preferencias do usuário
async function verificarPreferenciasUsuario(userId: number): Promise<number[]> {
  try {
    const prefUsersRepository = AppDataSource.getRepository(PrefUsers);
    const preferencias = await prefUsersRepository.find({
      where: { user_id: userId },
      select: ["preferencia_id"]
    });
    return preferencias.map(pref => pref.preferencia_id);
  } catch (error) {
    console.error("Erro ao verificar preferências do usuário:", error);
    return [];
  }
}

// funcao para enviar email de notificação para administradores
async function enviarEmailNotificacaoAdmin(admin: Users, usuario: Users, chamado: Chamados): Promise<void> {
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
    console.log(`Email de notificação enviado para admin ${admin.email}`);
  } catch (error) {
    console.error("Erro ao enviar email para admin:", error);
  }
}

// funcao para enviar email de confirmação para o usuário que abriu o chamado
async function enviarEmailConfirmacaoUsuario(usuario: Users, chamado: Chamados): Promise<void> {
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
                <li style="margin-bottom: 10px;"><strong>Número:</strong> #${chamado.numeroChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Resumo:</strong> ${chamado.resumoChamado}</li>
                <li style="margin-bottom: 10px;"><strong>Data de Abertura:</strong> ${new Date(chamado.dataAbertura).toLocaleString('pt-BR')}</li>
                <li style="margin-bottom: 10px;"><strong>Status:</strong> <span style="color: #f39c12; font-weight: bold;">Aberto</span></li>
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
    console.log(`Email de confirmação enviado para ${usuario.email}`);
  } catch (error) {
    console.error(" Erro ao enviar email de confirmação:", error);
  }
}
async function enviarEmailRedirecionamento(novoResponsavel: Users | null, usuarioQueRedirecionou: Users | null, chamado: Chamados): Promise<void> {
  console.log('📧 [EMAIL_REDIRECT] === INICIANDO FUNÇÃO DE EMAIL ===');
  console.log('[EMAIL_REDIRECT] Parâmetros recebidos:', {
    novoResponsavel: {
      id: novoResponsavel?.id,
      name: novoResponsavel?.name,
      email: novoResponsavel?.email
    },
    usuarioQueRedirecionou: {
      id: usuarioQueRedirecionou?.id,
      name: usuarioQueRedirecionou?.name,
      email: usuarioQueRedirecionou?.email
    },
    chamado: {
      id: chamado?.id,
      numero: chamado?.numeroChamado,
      resumo: chamado?.resumoChamado
    }
  });

  // Verificar se todos os parâmetros necessários estão presentes
  if (!novoResponsavel || !usuarioQueRedirecionou) {
    console.log('[EMAIL_REDIRECT] ⚠️ Email não enviado - usuários não encontrados:', {
      novoResponsavel: !!novoResponsavel,
      usuarioQueRedirecionou: !!usuarioQueRedirecionou,
      novoResponsavelData: novoResponsavel ? {id: novoResponsavel.id, email: novoResponsavel.email} : null,
      usuarioQueRedirecionouData: usuarioQueRedirecionou ? {id: usuarioQueRedirecionou.id, email: usuarioQueRedirecionou.email} : null
    });
    return; // sair silenciosamente se não há usuários
  }

  // verificar se é autoatribuicao (mesmo usuário)
  if (novoResponsavel.id === usuarioQueRedirecionou.id) {
    console.log('[EMAIL_REDIRECT] autoatribuicao detectada - não enviando email');
    return; // Não enviar email para si mesmo
  }

  //  verificar se o email do destinatário existe
  if (!novoResponsavel.email) {
    console.error('[EMAIL_REDIRECT] usuário destinatário não tem email válido:', {
      id: novoResponsavel.id,
      name: novoResponsavel.name,
      email: novoResponsavel.email
    });
    return; //nao pode enviar email sem destinatário
  }

  try {
    // Email de redirecionamento é sempre enviado (ação administrativa crítica)
    // caso quiser alterar depois e inserir preferencias de usuario pra decidier se envia email ou nao descomentar linhas abaixo:
    // const preferenciasResponsavel = await verificarPreferenciasUsuario(novoResponsavel.id);
    // if (preferenciasResponsavel.includes(1)) { // ID 1 = receber notificações de admin

    // verificar se as variáveis de ambiente estão configuradas
    console.log('[EMAIL] Verificando variáveis de ambiente...');
    console.log('[EMAIL] Variáveis encontradas:', {
      EMAIL_HOST: !!process.env.EMAIL_HOST ? 'DEFINIDO' : 'FALTANDO',
      EMAIL_USER: !!process.env.EMAIL_USER ? 'DEFINIDO' : 'FALTANDO', 
      EMAIL_PASS: !!process.env.EMAIL_PASS ? 'DEFINIDO' : 'FALTANDO',
      EMAIL_PORT: process.env.EMAIL_PORT || 'NÃO DEFINIDO'
    });

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('[EMAIL] Variáveis de ambiente de email não configuradas');
      console.error('[EMAIL] Verifique: EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM');
      return;
    }

    console.log('[EMAIL] Variáveis validadas. Criando transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('[EMAIL] 🔧 Transporter criado com configurações:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER
    });

    // testar conexão do transporter
    try {
      console.log('[EMAIL] Verificando conexão SMTP...');
      await transporter.verify();
      console.log('[EMAIL] Conexão SMTP verificada com sucesso');
    } catch (verifyError) {
      console.error('[EMAIL Erro na verificação SMTP:', verifyError);
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

    console.log('[EMAIL] Enviando email...', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    console.log('[EMAIL] CHAMANDO transporter.sendMail...');
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Email de redirecionamento enviado com sucesso!`);
    console.log(`[EMAIL] Destinatário: ${novoResponsavel.email} (${novoResponsavel.name})`);
    console.log(`[EMAIL]  Message ID: ${result.messageId}`);
    console.log(`[EMAIL] Response completa:`, JSON.stringify(result, null, 2));
    
    // }
  } catch (error) {
    console.error('[EMAIL_REDIRECT] erro ao enviar email de redirecionamento:', error);
    console.error('[EMAIL_REDIRECT] Detalhes completos do erro:', {
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      novoResponsavel: {
        id: novoResponsavel?.id,
        name: novoResponsavel?.name,
        email: novoResponsavel?.email
      },
      usuarioQueRedirecionou: {
        id: usuarioQueRedirecionou?.id,
        name: usuarioQueRedirecionou?.name,
        email: usuarioQueRedirecionou?.email
      },
      chamadoId: chamado?.id,
      numeroChamado: chamado?.numeroChamado
    });
    
    // Re-lançar o erro para que possa ser capturado pela função que chama, se necessário
    throw error;
  }
}

//funcao pra enviar email de conclusao pro usuario 
async function enviarEmailConclusaoUsuario(usuario: Users, chamado: Chamados, adminResponsavel: Users | null): Promise<void> {
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
    const dataFechamento = chamado.dataFechamento ? new Date(chamado.dataFechamento).toLocaleString('pt-BR') : "N/A";
        
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
    console.log(`Email de conclusão enviado SUCESSO para ${usuario.email}`);
  } catch (error) {
    console.error("[EMAIL CONCLUSÃO] Erro ao enviar email de conclusão:", error);
    console.error("[EMAIL CONCLUSÃO] Erro completo:", {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      dados_usuario: { email: usuario.email, name: usuario.name },
      dados_chamado: { id: chamado.id, numeroChamado: chamado.numeroChamado }
    });
  }
}


//cadastrar chamado //novo chamado
router.post("/chamados", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      ramal,
      prioridadeId,
      topicoAjudaId,
      departamentoId,
      resumoChamado,
      descricaoChamado,
    } = req.body;

    const usuarioId = req.userId; // ID do usuário vindo do token

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    // criar a data atual + log no backend
    const dataAtual = new Date();
    console.log('Data de abertura no backend:', dataAtual.toISOString());

    // criar chamado com apenas os campos obrigatórios iniciais
    const chamado = chamadoRepository.create({
      ramal,
      numeroChamado: Date.now(), // Gerado automaticamente (pode melhorar depois)
      dataAbertura: dataAtual, // defin explicitamente a data
      status: { id: 1 }, // 1 = ABERTO
      resumoChamado,
      descricaoChamado,
      usuario: { id: usuarioId }, // Usuário que abriu o chamado
      tipoPrioridade: { id: prioridadeId },
      topicoAjuda: { id: topicoAjudaId },
      departamento: { id: departamentoId },
      // Campos que ficam NULL inicialmente:
      // - dataAtribuicao (preenchido quando admin atribuir)
      // - userResponsavel (preenchido quando admin atribuir)
      // - dataFechamento (preenchido quando finalizar)
      // - userFechamento (preenchido quando finalizar)
    });

    await chamadoRepository.save(chamado);
    console.log('Chamado salvo - dataAbertura:', chamado.dataAbertura);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado aberto",
      statusAnterior: undefined, // Não tem status anterior quando abre
      statusNovo: { id: 1 }, // Status ABERTO
      dataMov: new Date(),
    });

    // recaarregar os chamados | essa parte traz as relacoes da tabela
    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status"],
    });

    // verif administradores que devem receber notificações
    const usersRepository = AppDataSource.getRepository(Users);
    const administradores = await usersRepository.find({
      where: { roleId: 1 }, // Buscar apenas administradores
      select: ["id", "name", "email"]
    });
    
    // buscar dados do usuário que abriu o chamado
    const usuarioSolicitante = await usersRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name", "email"]
    });
    
    if (usuarioSolicitante && administradores.length > 0) {
      // para cada administrador, verificar suas preferências e notificar
      for (const admin of administradores) {
        const preferenciasAdmin = await verificarPreferenciasUsuario(admin.id);
        
        // verif se deve enviar email (preferência ID 1)
        if (preferenciasAdmin.includes(1)) {
          await enviarEmailNotificacaoAdmin(admin, usuarioSolicitante, chamadoCompleto!);
        }
        
     
      }
      
      // verificar se o usuário quer receber email de abertura (preferência ID 2)
      const preferenciasUsuario = await verificarPreferenciasUsuario(usuarioSolicitante.id);
      if (preferenciasUsuario.includes(2)) {
        await enviarEmailConfirmacaoUsuario(usuarioSolicitante, chamadoCompleto!);
      }
    }

    return res.status(201).json({
      mensagem: "Chamado aberto com sucesso!",
      chamado: chamadoCompleto,
    });
  } catch (error) {
    console.error("Erro ao abrir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao abrir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});



//rotar para obter os chamados
router.get("/chamados/meus", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.userId;

    const chamados = await AppDataSource.getRepository(Chamados).find({
      where: { usuario: { id: usuarioId } },
      relations: ["tipoPrioridade", "departamento", "topicoAjuda", "status"],
      order: { dataAbertura: "DESC" },
    });

    return res.status(200).json(chamados);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});

// buscar um chamado específico por ID
router.get("/chamados/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const chamadoRepository = AppDataSource.getRepository(Chamados);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
        "userResponsavel",
        "userFechamento",
        "anexos"
      ],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Buscar apenas anexos do tipo CHAMADO (anexos iniciais) e gerar signed URLs
    const anexosIniciais = chamado.anexos?.filter(a => a.tipoAnexo === 'CHAMADO') || [];
    const anexosComUrls = await Promise.all(
      anexosIniciais.map(async (anexo) => {
        const { data: signedUrlData } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .createSignedUrl(anexo.url, 3600);
        
        return {
          id: anexo.id,
          filename: anexo.filename,
          signedUrl: signedUrlData?.signedUrl,
          criadoEm: anexo.criadoEm,
        };
      })
    );

    // Formatar resposta
    const chamadoFormatado = {
      id: chamado.id,
      numeroChamado: chamado.numeroChamado,
      ramal: chamado.ramal,
      resumoChamado: chamado.resumoChamado,
      descricaoChamado: chamado.descricaoChamado,
      dataAbertura: chamado.dataAbertura,
      dataAtribuicao: chamado.dataAtribuicao,
      dataFechamento: chamado.dataFechamento,
      usuario: chamado.usuario ? {
        id: chamado.usuario.id,
        name: chamado.usuario.name,
        email: chamado.usuario.email
      } : null,
      tipoPrioridade: chamado.tipoPrioridade,
      departamento: chamado.departamento,
      topicoAjuda: chamado.topicoAjuda,
      status: chamado.status,
      userResponsavel: chamado.userResponsavel ? {
        id: chamado.userResponsavel.id,
        name: chamado.userResponsavel.name
      } : null,
      userFechamento: chamado.userFechamento ? {
        id: chamado.userFechamento.id,
        name: chamado.userFechamento.name
      } : null,
      anexos: anexosComUrls, // Anexos iniciais com signed URLs
    };

    return res.status(200).json(chamadoFormatado);
  } catch (error) {
    console.error("Erro ao buscar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar chamado",
    });
  }
});


//rotar para obter os chamados com filtros (usuarios comuns e administradores)
router.get("/chamados", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      statusId, 
      topicoAjudaId, 
      assunto, 
      departamentoId, 
      prioridadeId, 
      nomeUsuario,
      dataAberturaInicio,
      dataAberturaFim,
      dataFechamentoInicio,
      dataFechamentoFim,
      page = 1,
      pageSize = 10
    } = req.query;
    
    const userRoleId = req.userRoleId; // role do usuario logado
    const userId = req.userId; // id do usuario logado

    // Converter para números
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSizeNum = userRoleId === 1 ? Math.max(1, parseInt(String(pageSize)) || 10) : Math.max(1, Math.min(100, parseInt(String(pageSize)) || 10)); // máximo 100 para usuários comuns, ilimitado para admins (até 10000)
    const offset = (pageNum - 1) * pageSizeNum;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const queryBuilder = chamadoRepository
      .createQueryBuilder("chamado")
      .leftJoinAndSelect("chamado.usuario", "usuario")
      .leftJoinAndSelect("chamado.tipoPrioridade", "tipoPrioridade")
      .leftJoinAndSelect("chamado.departamento", "departamento")
      .leftJoinAndSelect("chamado.topicoAjuda", "topicoAjuda")
      .leftJoinAndSelect("chamado.status", "status")
      .leftJoinAndSelect("chamado.userResponsavel", "userResponsavel")
      .leftJoinAndSelect("chamado.userFechamento", "userFechamento");

    // Filtro obrigatorio: usuarios comuns veem apenas seus proprios chamados
    if (userRoleId !== 1) {
      queryBuilder.andWhere("chamado.id_user = :userId", { userId });
    }

    // Lógica especial para ATRASADO (statusId = 4)
    if (statusId === '4') {
      // Buscar horas para atraso dos parâmetros do sistema
      const parametrosRepository = AppDataSource.getRepository(ParametrosSistema);
      const parametros = await parametrosRepository.findOne({ where: { id: 1 } });
      const horasParaAtraso = parametros?.horasParaAtraso || 24;

      // Calcular a data limite (agora - horasParaAtraso)
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - horasParaAtraso);

      // Filtrar chamados ABERTOS (status = 1) que estão abertos há mais tempo que o configurado
      queryBuilder.andWhere("chamado.id_status = :statusAberto", { statusAberto: 1 });
      queryBuilder.andWhere("chamado.data_abertura < :dataLimite", { dataLimite });
    } else if (statusId) {
      // Status normal (1, 2, 3)
      queryBuilder.andWhere("chamado.id_status = :statusId", { statusId });
    }

    // Filtro por tópico de ajuda
    if (topicoAjudaId) {
      queryBuilder.andWhere("chamado.id_topico_ajuda = :topicoAjudaId", { topicoAjudaId });
    }

    // Filtro por assunto (resumo ou descrição)
    if (assunto) {
      queryBuilder.andWhere(
        "(chamado.resumo_chamado ILIKE :assunto OR chamado.descricao_chamado ILIKE :assunto)",
        { assunto: `%${assunto}%` }
      );
    }

    // Filtros extras apenas para administradores (roleId = 1)
    if (userRoleId === 1) {
      // Filtro por departamento
      if (departamentoId) {
        queryBuilder.andWhere("chamado.id_departamento = :departamentoId", { departamentoId });
      }

      // Filtro por prioridade
      if (prioridadeId) {
        queryBuilder.andWhere("chamado.id_prioridade = :prioridadeId", { prioridadeId });
      }

      // Filtro por nome do usuário
      if (nomeUsuario) {
        queryBuilder.andWhere("usuario.name ILIKE :nomeUsuario", { nomeUsuario: `%${nomeUsuario}%` });
      }

      // Filtro por data de abertura
      if (dataAberturaInicio && dataAberturaFim) {
        queryBuilder.andWhere("chamado.data_abertura BETWEEN :dataAberturaInicio AND :dataAberturaFim", {
          dataAberturaInicio,
          dataAberturaFim,
        });
      } else if (dataAberturaInicio) {
        queryBuilder.andWhere("chamado.data_abertura >= :dataAberturaInicio", { dataAberturaInicio });
      } else if (dataAberturaFim) {
        queryBuilder.andWhere("chamado.data_abertura <= :dataAberturaFim", { dataAberturaFim });
      }

      // Filtro por data de fechamento
      if (dataFechamentoInicio && dataFechamentoFim) {
        queryBuilder.andWhere("chamado.data_fechamento BETWEEN :dataFechamentoInicio AND :dataFechamentoFim", {
          dataFechamentoInicio,
          dataFechamentoFim,
        });
      } else if (dataFechamentoInicio) {
        queryBuilder.andWhere("chamado.data_fechamento >= :dataFechamentoInicio", { dataFechamentoInicio });
      } else if (dataFechamentoFim) {
        queryBuilder.andWhere("chamado.data_fechamento <= :dataFechamentoFim", { dataFechamentoFim });
      }
    }

    // Ordenar por data de abertura (mais recentes primeiro)
    queryBuilder.orderBy("chamado.data_abertura", "DESC");

    // Obter total de registros ANTES de aplicar paginação
    const total = await queryBuilder.getCount();

    // Aplicar paginação
    queryBuilder.offset(offset).limit(pageSizeNum);

    const chamados = await queryBuilder.getMany();

    // Calcular total de páginas
    const totalPages = Math.ceil(total / pageSizeNum);

    // Formatar resposta
    const chamadosFormatados = chamados.map((chamado) => ({
      id: chamado.id,
      numeroChamado: chamado.numeroChamado,
      ramal: chamado.ramal,
      resumoChamado: chamado.resumoChamado,
      descricaoChamado: chamado.descricaoChamado,
      dataAbertura: chamado.dataAbertura,
      dataAtribuicao: chamado.dataAtribuicao,
      dataFechamento: chamado.dataFechamento,
      usuario: chamado.usuario ? { id: chamado.usuario.id, name: chamado.usuario.name } : null,
      tipoPrioridade: chamado.tipoPrioridade,
      departamento: chamado.departamento,
      topicoAjuda: chamado.topicoAjuda,
      status: chamado.status,
      userResponsavel: chamado.userResponsavel ? { id: chamado.userResponsavel.id, name: chamado.userResponsavel.name } : null,
      userFechamento: chamado.userFechamento ? { id: chamado.userFechamento.id, name: chamado.userFechamento.name } : null,
    }));

    return res.status(200).json({
      chamados: chamadosFormatados,
      total,
      totalPages,
      currentPage: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error) {
    console.error("Erro ao listar chamados:", error);
    return res.status(500).json({
      mensagem: "Erro ao listar chamados",
    });
  }
});

// atribuir chamado a um responsável (apenas admin)
router.put("/chamados/:id/atribuir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userResponsavelId } = req.body;
    const usuarioId = req.userId; // adm que está atribuindo


    console.log('[ATRIBUIR] Iniciando atribuição:', { 
      chamadoId: id, 
      userResponsavelId, 
      usuarioId,
      timestamp: new Date().toISOString()
    });

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);
    const statusRepository = AppDataSource.getRepository(StatusChamado);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["userResponsavel", "status"],
    });

    if (!chamado) {
      console.log('[ATRIBUIR]Chamado não encontrado');
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    console.log('[ATRIBUIR] Chamado encontrado:', { 
      chamadoId: chamado.id, 
      responsavelAtual: chamado.userResponsavel?.id 
    });

    // permite que qualquer administrador redirecione chamados
    // buscar dados do usuário que está fazendo a atribuição para verificar se é admin
    const usuarioQueAtribui = await userRepository.findOne({ 
      where: { id: usuarioId }, 
      relations: ["role"]
    });
    
    if (!usuarioQueAtribui) {
      console.log('[ATRIBUIR] Usuário que está atribuindo não encontrado');
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }
    
    // verificar se quem está atribuindo é administrador (role_id = 1)
    if (usuarioQueAtribui.roleId !== 1) {
      console.log('[ATRIBUIR] Usuário não é administrador');
      return res.status(403).json({ mensagem: "Apenas administradores podem redirecionar chamados." });
    }
    
    console.log('[ATRIBUIR] Usuário é administrador, pode redirecionar');

    // verificar se está tentando redirecionar para si mesmo
    if (userResponsavelId === usuarioId) {
      console.log('[ATRIBUIR] Tentando redirecionar para si mesmo');
      return res.status(400).json({ mensagem: "Você não pode redirecionar o chamado para si mesmo." });
    }

    console.log('[ATRIBUIR] Buscando usuários...');
    // Buscar nomes dos usuários para o histórico
    const [usuarioAtribuiu, usuarioResponsavel] = await Promise.all([
      userRepository.findOne({ where: { id: usuarioId }, select: ["id", "name", "email"] }),
      userRepository.findOne({ where: { id: userResponsavelId }, select: ["id", "name", "email"] })
    ]);

    if (!usuarioResponsavel) {
      console.log('[ATRIBUIR] Usuário responsável não encontrado');
      return res.status(404).json({ mensagem: "Usuário responsável não encontrado" });
    }

    console.log('[ATRIBUIR] Usuários encontrados:', { 
      atribuiu: usuarioAtribuiu?.name, 
      novo: usuarioResponsavel?.name 
    });

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 2;

    // atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: userResponsavelId } as Users;
    chamado.dataAtribuicao = new Date();
    
    //se o status for aberto id=1 entao mudar para id=2 em atendimento
    if (chamado.status?.id === 1) {
      const statusEmAtendimento = await statusRepository.findOne({ where: { id: 2 } });
      if (statusEmAtendimento) {
        chamado.status = statusEmAtendimento;
      }
    }

    console.log('[ATRIBUIR] 💾 Salvando chamado...');
    await chamadoRepository.save(chamado);

    // registrar no historico com nomes dos usuários
    const nomeQuemAtribuiu = usuarioAtribuiu?.name || "Usuário";
    const nomeResponsavel = usuarioResponsavel?.name || "Usuário";

    console.log('[ATRIBUIR]  PARTE DO EMAIL!');
    console.log('[ATRIBUIR] Dados para email:', {
      usuarioResponsavel: usuarioResponsavel ? {
        id: usuarioResponsavel.id,
        name: usuarioResponsavel.name,
        email: usuarioResponsavel.email
      } : 'NULL',
      usuarioAtribuiu: usuarioAtribuiu ? {
        id: usuarioAtribuiu.id,
        name: usuarioAtribuiu.name,
        email: usuarioAtribuiu.email
      } : 'NULL',
      chamado: {
        id: chamado.id,
        numero: chamado.numeroChamado,
        resumo: chamado.resumoChamado
      }
    });

    // Enviar email de redirecionamento
    try {
      console.log('[ATRIBUIR] 🚀 Tentando enviar email de redirecionamento...');
      await enviarEmailRedirecionamento(usuarioResponsavel, usuarioAtribuiu, chamado);
    } catch (emailError) {
      // Não falha a operação se o email der erro, apenas registra
      console.warn('[ATRIBUIR] ⚠️ Email de redirecionamento falhou, mas operação continua');
    }

    console.log('[ATRIBUIR] 💾 Salvando histórico...');
    await historicoRepository.save({
      chamado: { id: chamado.id },
      usuario: { id: usuarioId },
      acao: `${nomeQuemAtribuiu} redirecionou este chamado para ${nomeResponsavel}`,
      statusAnterior: { id: statusAnteriorId },
      statusNovo: { id: chamado.status?.id || 2 },
      dataMov: new Date(),
    });

    console.log('[ATRIBUIR] Atribuição concluída com sucesso');
    return res.status(200).json({
      mensagem: "Chamado atribuído com sucesso!",
      chamado,
    });
  } catch (error) {
    console.error("[ATRIBUIR] Erro ao atribuir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao atribuir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// assumir chamado (admin assume responsabilidade pelo chamado)
router.put("/chamados/:id/assumir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // usuário que está assumindo

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userResponsavel"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se já está encerrado
    if (chamado.status?.id === 3) {
      return res.status(400).json({ mensagem: "Não é possível assumir um chamado encerrado" });
    }

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 1;
    const responsavelAnterior = chamado.userResponsavel?.id;

    // Atribuir responsável e data de atribuição
    chamado.userResponsavel = { id: usuarioId } as Users;
    chamado.dataAtribuicao = new Date();
    
    // Se estava aberto (status 1), mudar para em atendimento (status 2)
    if (chamado.status?.id === 1) {
      chamado.status = { id: 2 } as StatusChamado; // 2 = EM ATENDIMENTO
    }

    await chamadoRepository.save(chamado);

    // Buscar nome do usuário para o histórico
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // registrar no historico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `Este chamado foi atribuído por ${nomeUsuario}`,
      statusAnterior: { id: statusAnteriorId },
      statusNovo: chamado.status,
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado atribuido com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atribuir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao atribuir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// reabrir chamado encerrado (apenas admin)
router.put("/chamados/:id/reabrir", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // usuário que está reabrindo

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se está encerrado
    if (chamado.status?.id !== 3) {
      return res.status(400).json({ mensagem: "Apenas chamados encerrados podem ser reabertos" });
    }

    // Buscar nome do usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // Limpar dados de fechamento
    chamado.dataFechamento = null;
    chamado.userFechamento = null;

    // Definir novo responsável (quem está reabrindo)
    chamado.userResponsavel = { id: usuarioId } as Users;
    chamado.dataAtribuicao = new Date();
    
    // mudar status para REABERTO (5)
    chamado.status = { id: 5 } as StatusChamado;

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} reabriu este chamado`,
      statusAnterior: { id: 3 }, // ENCERRADO
      statusNovo: { id: 5 }, // REABERTO
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado reaberto com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao reabrir chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao reabrir chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// editar chamado (apenas usuário criador e apenas se status = ABERTO)
router.put("/chamados/:id/editar", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId;
    const {
      resumoChamado,
      descricaoChamado,
      ramal,
      departamentoId,
      topicoAjudaId,
      prioridadeId,
    } = req.body;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "usuario"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar se é o criador do chamado
    if (chamado.usuario.id !== usuarioId) {
      return res.status(403).json({ mensagem: "Você não tem permissão para editar este chamado" });
    }

    // Verificar se está ABERTO (status 1)
    if (chamado.status?.id !== 1) {
      return res.status(400).json({ 
        mensagem: "Você não pode editar este chamado agora pois um usuário já está te ajudando com a resolução" 
      });
    }

    // Buscar nome do usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name"]
    });

    const nomeUsuario = usuario?.name || "Usuário";

    // Atualizar campos
    chamado.resumoChamado = resumoChamado;
    chamado.descricaoChamado = descricaoChamado;
    chamado.ramal = ramal;
    chamado.departamento = { id: departamentoId } as any;
    chamado.topicoAjuda = { id: topicoAjudaId } as any;
    chamado.tipoPrioridade = { id: prioridadeId } as any;

    await chamadoRepository.save(chamado);

    // Registrar no histórico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: `${nomeUsuario} editou este chamado`,
      statusAnterior: chamado.status,
      statusNovo: chamado.status,
      dataMov: new Date(),
    });

    // Recarregar com relações
    const chamadoAtualizado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: [
        "usuario",
        "userResponsavel",
        "userFechamento",
        "tipoPrioridade",
        "departamento",
        "topicoAjuda",
        "status",
      ],
    });

    return res.status(200).json({
      mensagem: "Chamado editado com sucesso!",
      chamado: chamadoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao editar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao editar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// remover anexo de chamado (usuário criador ou admin)
router.delete("/chamados/:id/anexo/:anexoId", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, anexoId } = req.params;
    const usuarioId = req.userId;

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const anexoRepository = AppDataSource.getRepository(ChamadoAnexos);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["usuario"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // Verificar permissão (criador ou admin)
    if (chamado.usuario.id !== usuarioId && req.userRoleId !== 1) {
      return res.status(403).json({ mensagem: "Você não tem permissão para remover este anexo" });
    }

    const anexo = await anexoRepository.findOne({
      where: { id: Number(anexoId), chamado: { id: Number(id) } },
    });

    if (!anexo) {
      return res.status(404).json({ mensagem: "Anexo não encontrado" });
    }

    // Remover arquivo do Supabase
    try {
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([anexo.url]);

      if (error) {
        console.error("Erro ao remover arquivo do Supabase:", error);
      }
    } catch (storageError) {
      console.error("Erro ao acessar Supabase Storage:", storageError);
    }

    // Remover do banco
    await anexoRepository.remove(anexo);

    return res.status(200).json({ mensagem: "Anexo removido com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover anexo:", error);
    return res.status(500).json({
      mensagem: "Erro ao remover anexo",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// encerrar chamado (apenas admin ou responsável)
router.put("/chamados/:id/encerrar", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.userId; // Admin que está encerrando

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);

    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userFechamento", "usuario"],
    });

    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // verificar se o chamado já está encerrado
    if (chamado.status?.id === 3) {
      return res.status(400).json({
        mensagem: "Chamado já foi fechado",
        dataFechamento: chamado.dataFechamento,
        usuarioEncerrou: chamado.userFechamento
          ? { id: chamado.userFechamento.id, name: chamado.userFechamento.name }
          : null,
      });
    }

    // save status anterior antes de mudar
    const statusAnteriorId = chamado.status?.id || 2;

    // Encerrar chamado
    chamado.status = { id: 3 } as StatusChamado; // 3 = ENCERRADO
    chamado.dataFechamento = new Date();
    chamado.userFechamento = { id: usuarioId } as Users;

    await chamadoRepository.save(chamado);

    // registrar no historico
    await historicoRepository.save({
      chamado,
      usuario: { id: usuarioId },
      acao: "Chamado encerrado",
      statusAnterior: { id: statusAnteriorId },
      statusNovo: { id: 3 }, // ENCERRADO
      dataMov: new Date(),
    });

    // recarregar o chamado com todas as relações
    const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel", "userFechamento"],
    });

    // buscar dados do responsável e do usuário para email
    const userRepository = AppDataSource.getRepository(Users);
    
    console.log('[EMAIL DEBUG] Dados do chamado para email:', {
      chamadoId: chamado.id,
      usuarioId: chamado.usuario?.id,
      usuarioName: chamado.usuario?.name,
      usuarioEmail: chamado.usuario?.email,
      adminResponsavelId: chamado.userFechamento?.id
    });
    
    const [usuarioChamado, adminResponsavel] = await Promise.all([
      chamado.usuario ? userRepository.findOne({ where: { id: chamado.usuario.id }, select: ["id", "name", "email"] }) : null,
      chamado.userFechamento ? userRepository.findOne({ where: { id: chamado.userFechamento.id }, select: ["id", "name", "email"] }) : null
    ]);
    
    console.log('[EMAIL DEBUG] Usuários encontrados:', {
      usuarioChamado: usuarioChamado ? { id: usuarioChamado.id, name: usuarioChamado.name, email: usuarioChamado.email } : 'NULL',
      adminResponsavel: adminResponsavel ? { id: adminResponsavel.id, name: adminResponsavel.name } : 'NULL'
    });

    // enviar email de conclusão para o usuário que abriu o chamado
    if (usuarioChamado) {
      console.log(`[EMAIL DEBUG] Iniciando envio de email de conclusão para: ${usuarioChamado.email}`);
      
      try {
      
        const preferenciasUsuario = await verificarPreferenciasUsuario(usuarioChamado.id);
        console.log(`[EMAIL DEBUG] Preferências do usuário ${usuarioChamado.id}:`, preferenciasUsuario);
        
        if (preferenciasUsuario.includes(3)) {
          console.log('[EMAIL DEBUG] Usuário tem preferência de email ativada, enviando email...');
          await enviarEmailConclusaoUsuario(usuarioChamado, chamadoCompleto!, adminResponsavel);
          console.log('[EMAIL DEBUG] Email de conclusão enviado com sucesso!');
        } else {
          console.log('[EMAIL DEBUG] Usuário NÃO tem preferência de email ativada (ID 3). Email não enviado.');
        }
    
      } catch (emailError) {
        console.error('[EMAIL ERROR] Erro ao enviar email de conclusão:', emailError);
      }
    } else {
      console.warn('[EMAIL DEBUG] Usuário do chamado não encontrado, email não enviado');
    }

    // formatar resposta para retornar apenas o nome dos ususrios
    const response = {
      ...chamadoCompleto,
      usuario: chamadoCompleto?.usuario ? { id: chamadoCompleto.usuario.id, name: chamadoCompleto.usuario.name } : null,
      userResponsavel: chamadoCompleto?.userResponsavel ? { id: chamadoCompleto.userResponsavel.id, name: chamadoCompleto.userResponsavel.name } : null,
      userFechamento: chamadoCompleto?.userFechamento ? { id: chamadoCompleto.userFechamento.id, name: chamadoCompleto.userFechamento.name } : null,
    };

    return res.status(200).json({
      mensagem: "Chamado encerrado com sucesso!",
      chamado: response,
    });
  } catch (error) {
    console.error("Erro ao encerrar chamado:", error);
    return res.status(500).json({
      mensagem: "Erro ao encerrar chamado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});


router.get("/chamados/:id/historico", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const historico = await AppDataSource.getRepository(ChamadoHistorico).find({
      where: { chamado: { id: Number(id) } },
      relations: ["usuario"],
      order: { dataMov: "ASC" },
    });

    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar histórico do chamado",
    });
  }
});


router.post("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.userId;

    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const statusRepository = AppDataSource.getRepository(StatusChamado);
    const usersRepository = AppDataSource.getRepository(Users);

    // buscar o chamado para pegar o status atual
    const chamado = await chamadoRepository.findOne({
      where: { id: Number(id) },
      relations: ["status", "userResponsavel"],
    });
    if (!chamado) {
      return res.status(404).json({ mensagem: "Chamado não encontrado" });
    }

    // buscar o usuario que está enviando a mensagem
    const usuarioAtual = await usersRepository.findOne({
      where: { id: usuarioId }
    });

    let statusAnterior = chamado.status;
    let statusNovo = chamado.status;
    let acao = "Mensagem enviada";

    // se o chamado estiver encerrado (status.id === 3), verificar limite e reabrir
    if (chamado.status.id === 3) {
      // verificar se já foi reaberto 2 vezes
      if (chamado.vezesReaberto >= 2) {
        return res.status(400).json({ 
          mensagem: "Você já reabriu esse chamado muitas vezes. Caso queira tratar do mesmo problema, abra outro chamado." 
        });
      }

      const statusReaberto = await statusRepository.findOne({ where: { id: 5 } }); // 5 = REABERTO
      if (statusReaberto) {
        chamado.status = statusReaberto;
        chamado.dataFechamento = null;
        chamado.userFechamento = null;
        chamado.vezesReaberto = (chamado.vezesReaberto || 0) + 1;
        await chamadoRepository.save(chamado);
        statusNovo = statusReaberto;
        acao = `${usuarioAtual?.name || 'Usuário'} reabriu este chamado ao enviar uma mensagem`;
      }
    }

    // Salvar mensagem
    const novaMensagem = mensagensRepository.create({
      mensagem,
      usuario: { id: usuarioId },
      chamado: { id: Number(id) },
    });
    await mensagensRepository.save(novaMensagem);

    // Salvar histórico
    await historicoRepository.save({
      chamado: { id: Number(id) },
      usuario: { id: usuarioId },
      acao,
      statusAnterior,
      statusNovo,
      dataMov: new Date(),
    });

    // Recarregar chamado com todas as relações
      const chamadoCompleto = await chamadoRepository.findOne({
      where: { id: chamado.id },
      relations: ["usuario", "tipoPrioridade", "departamento", "topicoAjuda", "status", "userResponsavel", "userFechamento"],
    });


    return res.status(201).json({
      mensagem: novaMensagem,
      chamado: chamadoCompleto,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao enviar mensagem",
    });
  }
});

// Buscar mensagens de um chamado
router.get("/chamados/:id/mensagens", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Buscando mensagens do chamado ${id}`);
    
    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const anexosRepository = AppDataSource.getRepository(ChamadoAnexos);
    
    // Buscar mensagens
    const mensagens = await mensagensRepository
      .createQueryBuilder("mensagem")
      .leftJoinAndSelect("mensagem.usuario", "usuario")
      .where("mensagem.chamado_id = :chamadoId", { chamadoId: Number(id) })
      .orderBy("mensagem.dataEnvio", "ASC")
      .getMany();

    console.log(`[DEBUG] Mensagens encontradas: ${mensagens.length}`);

    if (mensagens.length === 0) {
      return res.status(200).json([]);
    }

    // Buscar todos os anexos de uma vez
    const mensagensIds = mensagens.map(m => m.id);
    const todosAnexos = await anexosRepository
      .createQueryBuilder("anexo")
      .where("anexo.mensagemId IN (:...ids)", { ids: mensagensIds })
      .andWhere("anexo.tipoAnexo = :tipo", { tipo: 'MENSAGEM' })
      .getMany();

    console.log(`[DEBUG] Total de anexos encontrados: ${todosAnexos.length}`);

    // Mapear anexos para as mensagens correspondentes
    const mensagensComAnexos = await Promise.all(
      mensagens.map(async (msg) => {
        const anexosDaMensagem = todosAnexos.filter(anexo => anexo.mensagemId === msg.id);
        
        // Gerar signed URLs para cada anexo
        const anexosComSignedUrl = await Promise.all(
          anexosDaMensagem.map(async (anexo) => {
            try {
              const { data, error } = await supabase.storage
                .from(SUPABASE_BUCKET!)
                .createSignedUrl(anexo.url, 3600);

              if (error) {
                console.error(`[ERROR] Erro ao gerar signed URL para ${anexo.filename}:`, error);
                return { ...anexo, signedUrl: null };
              }

              return { ...anexo, signedUrl: data?.signedUrl };
            } catch (err) {
              console.error(`[ERROR] Exceção ao gerar signed URL:`, err);
              return { ...anexo, signedUrl: null };
            }
          })
        );

        return {
          ...msg,
          anexos: anexosComSignedUrl
        };
      })
    );

    console.log(`[DEBUG] Retornando ${mensagensComAnexos.length} mensagens com anexos`);
    return res.status(200).json(mensagensComAnexos);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar mensagens",
    });
  }
});

// Editar múltiplos chamados
router.patch("/chamados/editar-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds, statusId, prioridadeId, departamentoId, topicoAjudaId, userResponsavelId } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        message: "Nenhum chamado selecionado",
      });
    }

    if (!statusId && !prioridadeId && !departamentoId && !topicoAjudaId && !userResponsavelId) {
      return res.status(400).json({
        message: "Selecione ao menos um campo para alterar",
      });
    }

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);
    const statusRepository = AppDataSource.getRepository(StatusChamado);

    // Buscar usuário
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Buscar chamados
    const chamados = await chamadoRepository.find({
      where: chamadosIds.map((id: number) => ({ id })),
      relations: ["status", "tipoPrioridade"],
    });

    const erros: string[] = [];
    const alterados: number[] = [];

    for (const chamado of chamados) {
      const statusAnterior = chamado.status;
      const prioridadeAnterior = chamado.tipoPrioridade;
      let alterou = false;

      // Validar e alterar status
      if (statusId) {
        // Validação: não pode alterar para o mesmo status
        if (chamado.status.id === statusId) {
          const statusNome = chamado.status.nome.toLowerCase();
          if (statusNome.includes('aberto')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está aberto`);
            continue;
          } else if (statusNome.includes('encerrado') || statusNome.includes('fechado')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está encerrado`);
            continue;
          } else if (statusNome.includes('atendimento') || statusNome.includes('andamento')) {
            erros.push(`Chamado ${chamado.numeroChamado} já está em atendimento`);
            continue;
          }
        }

        const novoStatus = await statusRepository.findOne({
          where: { id: statusId },
        });

        if (novoStatus) {
          chamado.status = novoStatus;
          
          // Se for encerrado, definir data de fechamento e usuário que finalizou
          if (novoStatus.nome.toLowerCase().includes('encerrado') || 
              novoStatus.nome.toLowerCase().includes('fechado')) {
            chamado.dataFechamento = new Date();
            chamado.userFechamento = { id: usuarioId } as any;
          }

          // Salvar histórico de status
          await historicoRepository.save({
            chamado: { id: chamado.id },
            usuario: { id: usuarioId },
            acao: `${usuario.name} alterou o status do chamado para '${novoStatus.nome}'`,
            statusAnterior: { id: statusAnterior.id },
            statusNovo: { id: novoStatus.id },
            dataMov: new Date(),
          });

          alterou = true;
        }
      }

      // Validar e alterar prioridade
      if (prioridadeId && chamado.tipoPrioridade.id !== prioridadeId) {
        chamado.tipoPrioridade = { id: prioridadeId } as any;

        // Buscar nome da prioridade para o histórico
        const prioridadeRepository = AppDataSource.getRepository(TipoPrioridade);
        const prioridade = await prioridadeRepository.findOne({
          where: { id: prioridadeId },
        });

        const prioridadeNome = prioridade?.nome || 'DESCONHECIDA';

        // Salvar histórico de prioridade
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} definiu a prioridade deste chamado para: ${prioridadeNome.toUpperCase()}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      // altera departamento
      if (departamentoId && chamado.departamento?.id !== departamentoId) {
        chamado.departamento = { id: departamentoId } as any;

        // busca nome do departamento para o histórico
        const departamentoRepository = AppDataSource.getRepository(Departamentos);
        const departamento = await departamentoRepository.findOne({
          where: { id: departamentoId },
        });

        const departamentoNome = departamento?.name || 'DESCONHECIDO';

        // salva histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} alterou o departamento para: ${departamentoNome}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      // alterar o  tópico de ajuda
      if (topicoAjudaId && chamado.topicoAjuda?.id !== topicoAjudaId) {
        chamado.topicoAjuda = { id: topicoAjudaId } as any;

        // buscar o  nome do tópico para o histórico
        const topicoAjudaRepository = AppDataSource.getRepository(TopicosAjuda);
        const topicoAjuda = await topicoAjudaRepository.findOne({
          where: { id: topicoAjudaId },
        });

        const topicoNome = topicoAjuda?.nome || 'DESCONHECIDO';

        // salvar histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `${usuario.name} alterou o tópico de ajuda para: ${topicoNome}`,
          statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
          statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
          dataMov: new Date(),
        });

        alterou = true;
      }

      // redirecionar p o responsável
      if (userResponsavelId && chamado.userResponsavel?.id !== userResponsavelId) {
        const novoResponsavel = await userRepository.findOne({
          where: { id: userResponsavelId },
          select: ["id", "name", "email"]
        });

        if (novoResponsavel) {
          chamado.userResponsavel = { id: userResponsavelId } as any;
          chamado.dataAtribuicao = new Date();

          // salvar histórico
          await historicoRepository.save({
            chamado: { id: chamado.id },
            usuario: { id: usuarioId },
            acao: `${usuario.name} redirecionou este chamado para ${novoResponsavel.name}`,
            statusAnterior: chamado.status ? { id: chamado.status.id } : undefined,
            statusNovo: chamado.status ? { id: chamado.status.id } : undefined,
            dataMov: new Date(),
          });

          alterou = true;

          // só enviar email se não for o mesmo usuário (evitar auto-atribuição)
          if (userResponsavelId !== usuarioId) {
            console.log('[EDICAO_MULTIPLA] Enviando email de redirecionamento para usuário diferente');
            await enviarEmailRedirecionamento(novoResponsavel, usuario, chamado);
          } else {
            console.log('[EDICAO_MULTIPLA] Não enviando email - usuário atribuiu para si mesmo');
          }
        }
      }

      if (alterou) {
        await chamadoRepository.save(chamado);
        alterados.push(chamado.id);
      }
    }

    if (erros.length > 0 && alterados.length === 0) {
      return res.status(400).json({
        message: erros.join('. '),
      });
    }

    return res.status(200).json({
      message: `${alterados.length} chamado(s) alterado(s) com sucesso`,
      alterados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro ao editar múltiplos chamados:", error);
    return res.status(500).json({
      message: "Erro ao editar chamados",
    });
  }
});

// resolver múltiplos chamados (marcar como resolvido)
router.patch("/chamados/resolver-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds } = req.body;
    const usuarioId = req.userId;

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        mensagem: "Lista de IDs de chamados é obrigatória"
      });
    }

    console.log(`[RESOLVER MÚTIPLOS] Usuário ${usuarioId} resolvendo chamados:`, chamadosIds);

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const userRepository = AppDataSource.getRepository(Users);

    // buscar chamados que serão resolvidos
    const chamados = await chamadoRepository.find({
      where: chamadosIds.map(id => ({ id })),
      relations: ["usuario", "status", "userFechamento"]
    });

    if (chamados.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhum chamado encontrado"
      });
    }

    // verificar se há chamados já encerrados
    const chamadosJaEncerrados = chamados.filter(chamado => chamado.status?.id === 3);
    if (chamadosJaEncerrados.length > 0) {
      return res.status(400).json({
        mensagem: `${chamadosJaEncerrados.length} chamado(s) já estão encerrados`,
        chamadosEncerrados: chamadosJaEncerrados.map(c => c.id)
      });
    }

    // buscar dados do usuário para log
    const usuario = await userRepository.findOne({
      where: { id: usuarioId },
      select: ["id", "name", "email"]
    });

    const nomeUsuario = usuario?.name || "Usuário";
    const dataAtual = new Date();
    let chamadosProcessados = 0;
    let emailsEnviados = 0;

    // processar cada chamado
    for (const chamado of chamados) {
      try {
        const statusAnteriorId = chamado.status?.id || 2;
        
        // att status para ENCERRADO (3)
        chamado.status = { id: 3 } as any;
        chamado.dataFechamento = dataAtual;
        chamado.userFechamento = { id: usuarioId } as any;

        await chamadoRepository.save(chamado);

        // registrar no histórico
        await historicoRepository.save({
          chamado: { id: chamado.id },
          usuario: { id: usuarioId },
          acao: `Chamado resolvido por ${nomeUsuario}`,
          statusAnterior: { id: statusAnteriorId },
          statusNovo: { id: 3 },
          dataMov: dataAtual,
        });

        // buscar dados do usuário do chamado para email
        if (chamado.usuario?.id) {
          const usuarioChamado = await userRepository.findOne({
            where: { id: chamado.usuario.id },
            select: ["id", "name", "email"]
          });

          if (usuarioChamado) {
            console.log(`Enviando email de conclusão para chamado #${chamado.id} - ${usuarioChamado.email}`);
            // verificar se o usuário quer receber email de conclusão (preferência ID 3)
            const preferenciasUsuario = await verificarPreferenciasUsuario(usuarioChamado.id);
            if (preferenciasUsuario.includes(3)) {
              await enviarEmailConclusaoUsuario(usuarioChamado, chamado, usuario);
            }
            emailsEnviados++;
          }
        }

        chamadosProcessados++;
        console.log(`chamado #${chamado.id} resolvido com sucesso`);
      } catch (error) {
        console.error(`erro ao processar chamado #${chamado.id}:`, error);
      }
    }

    console.log(`[RESOLVER MÚTIPLOS] Processados: ${chamadosProcessados}/${chamados.length}, Emails: ${emailsEnviados}`);

    return res.status(200).json({
      mensagem: `${chamadosProcessados} chamado(s) resolvido(s) com sucesso!`,
      processados: chamadosProcessados,
      total: chamados.length,
      emailsEnviados
    });
  } catch (error) {
    console.error("[RESOLVER MÚTIPLOS] Erro geral:", error);
    return res.status(500).json({
      mensagem: "Erro ao resolver chamados",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Buscar lista de status
router.get("/status", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusRepository = AppDataSource.getRepository(StatusChamado);
    const statusList = await statusRepository.find({
      order: { id: "ASC" },
    });

    // Mapear para incluir descricaoStatus (compatibilidade com frontend)
    const statusFormatted = statusList.map(status => ({
      id: status.id,
      descricaoStatus: status.nome,
      nome: status.nome,
    }));

    return res.status(200).json(statusFormatted);
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    return res.status(500).json({
      mensagem: "Erro ao buscar status",
    });
  }
});

// deletar multiplos chamados (apenas administradores)
router.delete("/chamados/excluir-multiplos", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chamadosIds } = req.body;
    const usuarioId = req.userId;
    const userRoleId = req.userRoleId;

    // verificar se é administrador
    if (userRoleId !== 1) {
      return res.status(403).json({
        mensagem: "Apenas administradores podem excluir chamados"
      });
    }

    if (!chamadosIds || !Array.isArray(chamadosIds) || chamadosIds.length === 0) {
      return res.status(400).json({
        mensagem: "Lista de IDs de chamados é obrigatória"
      });
    }

    console.log(`[EXCLUIR MULTIPLOS] Usuário ${usuarioId} excluindo chamados:`, chamadosIds);

    const chamadoRepository = AppDataSource.getRepository(Chamados);
    const historicoRepository = AppDataSource.getRepository(ChamadoHistorico);
    const mensagensRepository = AppDataSource.getRepository(ChamadoMensagens);
    const anexosRepository = AppDataSource.getRepository(ChamadoAnexos);

    // buscar chamados que serão excluídos
    const chamados = await chamadoRepository.find({
      where: chamadosIds.map(id => ({ id })),
      relations: ["usuario", "anexos"]
    });

    if (chamados.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhum chamado encontrado"
      });
    }

    let chamadosExcluidos = 0;
    let errosExclusao: string[] = [];

    // processar cada chamado
    for (const chamado of chamados) {
      try {
        console.log(`[EXCLUIR] Processando chamado #${chamado.id}`);
        
        // remover anexos do Supabase Storage
        if (chamado.anexos && chamado.anexos.length > 0) {
          console.log(`[EXCLUIR] Removendo ${chamado.anexos.length} anexos do chamado #${chamado.id}`);
          const urlsAnexos = chamado.anexos.map(anexo => anexo.url);
          
          try {
            const { error } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .remove(urlsAnexos);
              
            if (error) {
              console.error(`[EXCLUIR] Erro ao remover anexos do Storage:`, error);
            }
          } catch (storageError) {
            console.error(`[EXCLUIR] Erro ao acessar Supabase Storage:`, storageError);
          }
        }

        // remover registros relacionados (em ordem de dependência)
        await anexosRepository.delete({ chamado: { id: chamado.id } });
        await mensagensRepository.delete({ chamado: { id: chamado.id } });
        await historicoRepository.delete({ chamado: { id: chamado.id } });
        
        // remover o chamado
        await chamadoRepository.remove(chamado);
        
        chamadosExcluidos++;
        console.log(`[EXCLUIR] Chamado #${chamado.id} excluído com sucesso`);
        
      } catch (error) {
        const mensagemErro = `Erro ao excluir chamado #${chamado.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        console.error(`[EXCLUIR] ${mensagemErro}`);
        errosExclusao.push(mensagemErro);
      }
    }

    console.log(`[EXCLUIR MULTIPLOS] Resultado: ${chamadosExcluidos}/${chamados.length} excluídos, ${errosExclusao.length} erros`);

    if (errosExclusao.length > 0 && chamadosExcluidos === 0) {
      return res.status(500).json({
        mensagem: "Falha ao excluir chamados",
        erros: errosExclusao
      });
    }

    return res.status(200).json({
      mensagem: `${chamadosExcluidos} chamado(s) excluído(s) com sucesso`,
      excluidos: chamadosExcluidos,
      total: chamados.length,
      erros: errosExclusao.length > 0 ? errosExclusao : undefined
    });
    
  } catch (error) {
    console.error("[EXCLUIR MULTIPLOS] Erro geral:", error);
    return res.status(500).json({
      mensagem: "Erro ao excluir chamados",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

export default router;
