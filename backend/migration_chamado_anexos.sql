-- Criar tabela chamado_anexos
CREATE TABLE IF NOT EXISTS chamado_anexos (
    id SERIAL PRIMARY KEY,
    "chamadoId" INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    "criadoEm" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chamado_anexos_chamado 
        FOREIGN KEY ("chamadoId") 
        REFERENCES chamados(id_chamado) 
        ON DELETE CASCADE
);

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_chamado_anexos_chamadoId ON chamado_anexos("chamadoId");
