-- ============================================================
-- Migration 7: Corrige o CHECK constraint da coluna tipo em
--              email_topico_destinatarios para incluir 'to'.
--
-- Necessária porque a migration 6 foi executada antes de
-- adicionar o tipo 'to' à funcionalidade.
-- Execute no painel SQL do Supabase.
-- ============================================================

BEGIN;

-- Remove a constraint antiga (apenas 'cc' e 'bcc')
ALTER TABLE email_topico_destinatarios
  DROP CONSTRAINT IF EXISTS chk_email_topico_dest_tipo;

-- Recria aceitando 'to', 'cc' e 'bcc'
ALTER TABLE email_topico_destinatarios
  ADD CONSTRAINT chk_email_topico_dest_tipo
    CHECK (tipo IN ('to', 'cc', 'bcc'));

COMMIT;
