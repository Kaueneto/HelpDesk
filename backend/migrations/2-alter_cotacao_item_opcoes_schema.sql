-- Migração incremental para o novo formato das opções de cotação
-- Converte os campos antigos para o novo modelo sem depender da migration inicial

BEGIN;

ALTER TABLE cotacao_item_opcoes
  ADD COLUMN IF NOT EXISTS valor_avista DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_parcelado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_frete DECIMAL(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotacao_item_opcoes' AND column_name = 'valor_unitario'
  ) THEN
    UPDATE cotacao_item_opcoes
    SET valor_avista = COALESCE(valor_avista, COALESCE(valor_unitario, 0)),
        valor_parcelado = COALESCE(valor_parcelado, 0),
        valor_frete = COALESCE(valor_frete, 0);
  END IF;
END $$;

ALTER TABLE cotacao_item_opcoes
  DROP COLUMN IF EXISTS valor_unitario,
  DROP COLUMN IF EXISTS prazo_entrega;

ALTER TABLE cotacao_item_opcoes
  ALTER COLUMN valor_avista SET DEFAULT 0,
  ALTER COLUMN valor_parcelado SET DEFAULT 0,
  ALTER COLUMN valor_frete SET DEFAULT 0;

COMMIT;
