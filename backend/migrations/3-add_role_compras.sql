-- ============================================================
-- Migration 3: Adiciona o perfil "Compras" ao sistema
-- 
-- O que esta migration faz:
--   1. Insere o role 'Compras' na tabela roles (id = 3)
--   2. Garante que a coluna role_id dos usuários aceita o novo valor
-- 
-- ATENÇÃO: Execute apenas uma vez. Verifique antes se já existe
--          um registro com id = 3 na tabela roles.
-- ============================================================

-- 1. Inserir o novo role
--    Usamos INSERT ... ON CONFLICT DO NOTHING para ser idempotente
--    (seguro rodar mais de uma vez sem erro).
INSERT INTO roles (id, nome)
VALUES (4, 'Compras')
ON CONFLICT (id) DO NOTHING;

-- 2. Resetar a sequence da tabela roles para o próximo valor correto
--    (evita conflito ao criar roles futuros via ORM)
SELECT setval(
  pg_get_serial_sequence('roles', 'id'),
  GREATEST((SELECT MAX(id) FROM roles), 1)
);

-- ============================================================
-- Resultado esperado:
--   id=1  → Administrador  (existente)
--   id=2  → Usuário        (existente)
--   id=3  → Compras        (novo)
-- ============================================================
