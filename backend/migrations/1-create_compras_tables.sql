-- Criação das tabelas para o módulo de Compras

-- 1. Tabela de Cotações
CREATE TABLE IF NOT EXISTS cotacoes (
    id SERIAL PRIMARY KEY,
    chamado_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'EM_ANDAMENTO',
    criado_por INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_cotacoes_chamado FOREIGN KEY (chamado_id) REFERENCES chamados(id_chamado) ON DELETE CASCADE,
    CONSTRAINT fk_cotacoes_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_cotacoes_status CHECK (status IN ('EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'EM_COMPRA', 'FINALIZADA', 'CANCELADA'))
);

-- 2. Tabela de Itens da Cotação
CREATE TABLE IF NOT EXISTS cotacao_itens (
    id SERIAL PRIMARY KEY,
    cotacao_id INTEGER NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_cotacao_itens_cotacao FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE
);

-- 3. Tabela de Opções de Cotação (Pesquisas de Preço)
CREATE TABLE IF NOT EXISTS cotacao_item_opcoes (
    id SERIAL PRIMARY KEY,
    cotacao_item_id INTEGER NOT NULL,
    fornecedor VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(500) NOT NULL,
    link_produto VARCHAR(500),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario DECIMAL(10, 2) NOT NULL CHECK (valor_unitario > 0),
    valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total > 0),
    prazo_entrega VARCHAR(100),
    observacao TEXT,
    selecionado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_cotacao_item_opcoes_item FOREIGN KEY (cotacao_item_id) REFERENCES cotacao_itens(id) ON DELETE CASCADE
);

-- 4. Tabela de Classificações das Opções (Ícones)
CREATE TABLE IF NOT EXISTS cotacao_item_opcao_classificacoes (
    id SERIAL PRIMARY KEY,
    cotacao_item_opcao_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_classificacoes_opcao FOREIGN KEY (cotacao_item_opcao_id) REFERENCES cotacao_item_opcoes(id) ON DELETE CASCADE,
    CONSTRAINT chk_classificacoes_tipo CHECK (tipo IN ('ESCOLHIDO', 'RECOMENDADO', 'MELHOR_CUSTO_BENEFICIO', 'MENOR_PRECO')),
    CONSTRAINT uk_classificacoes_opcao_tipo UNIQUE (cotacao_item_opcao_id, tipo)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_cotacoes_chamado ON cotacoes(chamado_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_criado_por ON cotacoes(criado_por);
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cotacao ON cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_item_opcoes_item ON cotacao_item_opcoes(cotacao_item_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_item_opcoes_selecionado ON cotacao_item_opcoes(selecionado);
CREATE INDEX IF NOT EXISTS idx_classificacoes_opcao ON cotacao_item_opcao_classificacoes(cotacao_item_opcao_id);

-- Comentários nas tabelas
COMMENT ON TABLE cotacoes IS 'Armazena as cotações vinculadas aos chamados de solicitação de compras';
COMMENT ON TABLE cotacao_itens IS 'Itens que estão sendo cotados em cada cotação';
COMMENT ON TABLE cotacao_item_opcoes IS 'Opções de fornecedores/preços para cada item da cotação';
COMMENT ON TABLE cotacao_item_opcao_classificacoes IS 'Classificações/ícones para destacar opções específicas';

-- Comentários nas colunas principais
COMMENT ON COLUMN cotacoes.status IS 'Status atual da cotação: EM_ANDAMENTO, AGUARDANDO_APROVACAO, APROVADA, EM_COMPRA, FINALIZADA, CANCELADA';
COMMENT ON COLUMN cotacao_item_opcoes.selecionado IS 'Indica se esta opção foi escolhida para compra';
COMMENT ON COLUMN cotacao_item_opcao_classificacoes.tipo IS 'Tipo de classificação: ESCOLHIDO, RECOMENDADO, MELHOR_CUSTO_BENEFICIO, MENOR_PRECO';
