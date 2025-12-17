<<<<<<< HEAD
# API HelpDesk

sistema de gerenciamento de chamados (tickets) | helpdesk
desenvolvido com **Node.js**, **Express**, **TypeORM** e **PostgreSQL**.
---

## Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Funcionalidades](#-funcionalidades)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)
- [Rotas da API](#-rotas-da-api)
- [Regras de Negócio](#-regras-de-negócio)
- [Segurança](#-segurança)

---

## Tecnologias

### Core
- **Node.js** - Runtime JavaScript
- **Express 5.1.0** - Framework web
- **TypeScript** - Tipagem estática
- **TypeORM 0.3.28** - ORM para PostgreSQL

### Banco de Dados
- **PostgreSQL** - Banco de dados relacional
- **Supabase** - Plataforma de hospedagem PostgreSQL

### Autenticação & Segurança
- **jsonwebtoken 9.0.2** - Geração e validação de tokens JWT
- **bcryptjs 3.0.3** - Criptografia de senhas (salt rounds: 10)

### Validação & Comunicação
- **yup 1.7.1** - Validação de schemas
- **nodemailer 7.0.10** - Envio de emails (recuperação de senha)
- **crypto** - Geração de tokens seguros

### Utilitários
- **cors 2.8.5** - Configuração de CORS
- **dotenv 17.2.3** - Variáveis de ambiente
- **concurrently** - Execução paralela de scripts

---

## Funcionalidades

###  Sistema de Autenticação
-  Login com email e senha
-  Geração de token JWT (expiração: 8 horas)
-  Validação de token
-  Recuperação de senha via email
-  Proteção de rotas com middleware JWT

### Gerenciamento de Chamados
-  Abertura de chamados (usuários autenticados)
-  Listagem de chamados próprios (usuário logado)
-  Listagem de todos os chamados (administradores)
-  Atribuição de responsável (muda status para "EM ATENDIMENTO")
-  Encerramento de chamados
-  *não é possivel encerrar chamado ja encerrado* (retorna aviso com data e usuário que fechou)
-  Sistema de mensagens em chamados
-  Histórico completo de ações do chamado

###  Gerenciamento de Usuários
-  Cadastro de usuários
-  Atualização de dados
-  Alteração de senha com criptografia
-  Validação de email único
-  Status ativo/inativo

###  Dados Auxiliares
-  Gerenciamento de departamentos
-  Tipos de prioridade (com cor hexadecimal e ordem de exibição)
-  Tópicos de ajuda (categorias de chamados)
-  Perfis de usuário (roles)
-  Status de chamados (Aberto, Em Atendimento, Encerrado)

---
##  Regras iniciais

### Chamados
1.  Ao abrir um chamado:
   - Status inicial: **ABERTO** (id=1)
   - `dataAbertura` é preenchida automaticamente
   - Registra ação no histórico

2.  Ao atribuir responsável:
   - Status muda para **EM ATENDIMENTO** (id=2)
   - `dataAtribuicao` é preenchida
   - `userResponsavel` é definido
   - Registra ação no histórico

3.  Ao encerrar chamado:
   - **Verifica se já está encerrado** (status=3)
   - Se já estiver encerrado, retorna erro 400 com data e usuário que fechou
   - Se não, muda status para **ENCERRADO** (id=3)
   - `dataFechamento` é preenchida
   - `userFechamento` é definido
   - Registra ação no histórico

4. Ao enviar mensagem:
   - Registra mensagem com autor e data
   - Adiciona entrada no histórico
   - Status do chamado não muda

### Usuários
1.  Senha sempre criptografada com bcrypt (10 salt rounds)
2.  Email deve ser único
3.  Apenas usuários ativos podem fazer login

### Histórico
1. Todas as ações são registradas:
   - Abertura de chamado
   - Atribuição de responsável
   - Envio de mensagens
   - Encerramento
2.  Registra status anterior e novo (quando aplicável)
3.  Registra usuário que realizou a ação

---

## Segurança

### Autenticação JWT
- **Token expira em 8 horas**
- Token deve ser enviado no header: `Authorization: Bearer <token>`
- Middleware `verifyToken` protege rotas sensíveis

### Criptografia
- Senhas criptografadas com **bcrypt** (10 salt rounds)
- Tokens de recuperação gerados com **crypto** (32 bytes hex)

### Validações
- Schemas validados com **yup**
- Validação de unicidade (email, nome de prioridades, etc.)
- Validação de formato (cor hexadecimal: `#RRGGBB`)

### Proteção de Dados
- Senhas nunca retornadas em JSON
- Na resposta de encerramento, apenas `id` e `name` dos usuários são retornados

---
=======

>>>>>>> b712fda078fddad6525812125630da3e7abf00fb
