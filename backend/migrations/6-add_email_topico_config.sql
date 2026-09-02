-- ============================================================
-- Migration 6: Configuração de envio automático de e-mail por tópico
-- Execute no painel SQL do Supabase
-- ============================================================

BEGIN;

-- 1. Tabela de configurações de e-mail por tópico
-- Cada linha representa uma configuração para um tópico específico.
-- UNIQUE(topico_id) garante que não existam configurações duplicadas por tópico.
CREATE TABLE IF NOT EXISTS email_topico_config (
    id            SERIAL PRIMARY KEY,
    topico_id     INTEGER NOT NULL,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por    INTEGER,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    editado_por   INTEGER,
    editado_em    TIMESTAMPTZ,

    CONSTRAINT fk_email_topico_config_topico
        FOREIGN KEY (topico_id) REFERENCES topicos_ajuda(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_email_topico_config_criado_por
        FOREIGN KEY (criado_por) REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_email_topico_config_editado_por
        FOREIGN KEY (editado_por) REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_email_topico_config_topico UNIQUE (topico_id)
);

COMMENT ON TABLE email_topico_config IS
    'Configurações de envio automático de e-mail para cada tópico de chamado';
COMMENT ON COLUMN email_topico_config.topico_id IS
    'Referência ao tópico de ajuda. Uma configuração por tópico.';
COMMENT ON COLUMN email_topico_config.ativo IS
    'Indica se o disparo automático está habilitado para este tópico.';

-- 2. Tabela de destinatários por configuração
-- Cada linha representa um destinatário (CC ou BCC) vinculado a uma configuração.
CREATE TABLE IF NOT EXISTS email_topico_destinatarios (
    id         SERIAL PRIMARY KEY,
    config_id  INTEGER NOT NULL,
    email      VARCHAR(255) NOT NULL,
    tipo       VARCHAR(3) NOT NULL,

    CONSTRAINT fk_email_topico_dest_config
        FOREIGN KEY (config_id) REFERENCES email_topico_config(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_email_topico_dest_tipo
        CHECK (tipo IN ('to', 'cc', 'bcc')),

    CONSTRAINT uq_email_topico_dest_config_email
        UNIQUE (config_id, email)
);

COMMENT ON TABLE email_topico_destinatarios IS
    'Destinatários (CC ou BCC) de cada configuração de e-mail por tópico';
COMMENT ON COLUMN email_topico_destinatarios.tipo IS
    'Tipo do destinatário: to (principal), cc (cópia) ou bcc (cópia oculta)';

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_email_topico_config_topico
    ON email_topico_config(topico_id);

CREATE INDEX IF NOT EXISTS idx_email_topico_dest_config
    ON email_topico_destinatarios(config_id);

COMMIT;
