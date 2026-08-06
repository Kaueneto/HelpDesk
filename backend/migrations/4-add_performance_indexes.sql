-- ============================================================
-- Migration 4: Índices de performance
-- Nomes verificados diretamente nas entidades TypeORM
-- Execute no painel SQL do Supabase
-- ============================================================

--  chamados 
-- tabela: chamados | PK: id_chamado
CREATE INDEX IF NOT EXISTS idx_chamados_status        ON chamados(id_status);
CREATE INDEX IF NOT EXISTS idx_chamados_usuario       ON chamados(id_user);
CREATE INDEX IF NOT EXISTS idx_chamados_responsavel   ON chamados(id_user_responsavel);
CREATE INDEX IF NOT EXISTS idx_chamados_topico        ON chamados(id_topico_ajuda);
CREATE INDEX IF NOT EXISTS idx_chamados_departamento  ON chamados(id_departamento);
CREATE INDEX IF NOT EXISTS idx_chamados_abertura      ON chamados(data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_numero        ON chamados(numero_chamado);

--  mensagens 
-- tabela: chamados_mensagens (note o 's' — entidade usa @Entity("chamados_mensagens"))
-- colunas: chamado_id, data_envio
CREATE INDEX IF NOT EXISTS idx_mensagens_chamado      ON chamados_mensagens(chamado_id, data_envio ASC);
CREATE INDEX IF NOT EXISTS idx_mensagens_usuario      ON chamados_mensagens(user_id);

--  histórico 
-- tabela: chamado_historico (sem 's')
-- colunas: chamado_id, data_mov
CREATE INDEX IF NOT EXISTS idx_historico_chamado      ON chamado_historico(chamado_id, data_mov ASC);
CREATE INDEX IF NOT EXISTS idx_historico_usuario      ON chamado_historico(usuario_id);

--  anexos 
-- tabela: "ChamadoAnexos" (com aspas — entidade usa @Entity("ChamadoAnexos"))
-- colunas: "chamadoId", "mensagemId", "tipoAnexo"
CREATE INDEX IF NOT EXISTS idx_anexos_chamado         ON "ChamadoAnexos"("chamadoId");
CREATE INDEX IF NOT EXISTS idx_anexos_mensagem        ON "ChamadoAnexos"("mensagemId") WHERE "mensagemId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anexos_tipo            ON "ChamadoAnexos"("tipoAnexo");

--  users 
-- tabela: users
-- colunas: email, role_id, situation_user_id
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role             ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_situation        ON users(situation_user_id);

--  cotações ─
-- tabela: cotacoes | colunas: chamado_id, status, created_at
CREATE INDEX IF NOT EXISTS idx_cotacoes_chamado       ON cotacoes(chamado_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status        ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_criado_em     ON cotacoes(created_at DESC);

--  itens de cotação 
-- tabela: cotacao_itens | coluna: cotacao_id
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cotacao  ON cotacao_itens(cotacao_id);

--  opções de cotação 
-- tabela: cotacao_item_opcoes | colunas: cotacao_item_id, selecionado
CREATE INDEX IF NOT EXISTS idx_cotacao_opcoes_item    ON cotacao_item_opcoes(cotacao_item_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_opcoes_sel     ON cotacao_item_opcoes(selecionado) WHERE selecionado = true;

--  sugestões 
-- tabela: sugestoes | colunas: status, created_at, usuario_criacao_id, departamento_id
CREATE INDEX IF NOT EXISTS idx_sugestoes_status       ON sugestoes(status);
CREATE INDEX IF NOT EXISTS idx_sugestoes_criado_em    ON sugestoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sugestoes_usuario      ON sugestoes(usuario_criacao_id);
CREATE INDEX IF NOT EXISTS idx_sugestoes_departamento ON sugestoes(departamento_id);

--  votos de sugestões 
-- tabela: sugestoes_votos | colunas: sugestao_id, usuario_id
CREATE INDEX IF NOT EXISTS idx_sugestoes_votos_sug    ON sugestoes_votos(sugestao_id);
CREATE INDEX IF NOT EXISTS idx_sugestoes_votos_user   ON sugestoes_votos(usuario_id);
