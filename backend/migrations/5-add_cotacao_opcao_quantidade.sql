-- Migration 5: garante quantidade por opção de cotação.
-- Pode ser executada em bancos que já possuam ou não a coluna.

BEGIN;

ALTER TABLE cotacao_item_opcoes
  ADD COLUMN IF NOT EXISTS quantidade INTEGER;

UPDATE cotacao_item_opcoes
SET quantidade = 1
WHERE quantidade IS NULL OR quantidade <= 0;

ALTER TABLE cotacao_item_opcoes
  ALTER COLUMN quantidade SET DEFAULT 1,
  ALTER COLUMN quantidade SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'cotacao_item_opcoes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%quantidade > 0%'
  ) THEN
    ALTER TABLE cotacao_item_opcoes
      ADD CONSTRAINT chk_cotacao_item_opcoes_quantidade_positiva
      CHECK (quantidade > 0);
  END IF;
END $$;

COMMIT;
