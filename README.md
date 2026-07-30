## Funcionalidades

### Sistema de Autenticação

- Login com e-mail e senha
- Autenticação utilizando JWT (expiração de 8 horas)
- Recuperação de senha por e-mail
- Rotas protegidas por middleware
- Apenas usuários ativos podem acessar o sistema

---

### Gerenciamento de Chamados

- Abertura de chamados entre departamentos
- Abertura de chamados pessoais (tarefas)
- Atribuição de responsável
- Encerramento de chamados
- Sistema de mensagens integrado
- Histórico completo de ações
- Reabertura controlada de chamados
- Visualização em lista e Kanban
- Filtros rápidos e pesquisa
- Agrupamento por Status, Prioridade, Departamento e Tópico de Ajuda

---

### Gerenciamento de Usuários

- Cadastro e edição de usuários
- Alteração de senha com criptografia
- Controle de usuários ativos/inativos
- Validação de e-mail único
- Controle de perfis (roles)

---

### Dados Auxiliares

- Gerenciamento de departamentos
- Gerenciamento de prioridades
- Gerenciamento de tópicos de ajuda
- Gerenciamento dos status dos chamados

---

## Regras de Negócio

### Abertura de Chamados

Ao criar um chamado:

- Status inicial: **ABERTO**
- Data de abertura preenchida automaticamente
- Registro automático no histórico

---

### Atribuição de Responsável

Ao assumir um chamado:

- Status alterado para **EM ATENDIMENTO**
- Responsável definido automaticamente
- Data de atribuição registrada
- Histórico atualizado

---

### Encerramento

Ao encerrar um chamado:

- Verifica se o chamado já foi encerrado
- Caso já esteja encerrado, retorna um aviso contendo a data e o usuário responsável pelo encerramento
- Define o status como **ENCERRADO/CONCLUIDO**
- Registra data e usuário responsável pelo fechamento
- Adiciona a ação ao histórico

---

### Reabertura de Chamados

Caso o solicitante ainda não tenha seu problema resolvido após o encerramento:

- O usuário pode reabrir o chamado enviando uma nova mensagem
- O chamado retorna automaticamente para atendimento
- Cada chamado pode ser reaberto no máximo **duas vezes**
- Após atingir esse limite, novas reaberturas são bloqueadas
- O sistema informa ao usuário que será necessário abrir um novo chamado para continuidade do atendimento
- Todas as reaberturas ficam registradas no histórico

---

### Sistema de Mensagens

Ao enviar uma mensagem:

- Registra o autor da mensagem
- Registra data e horário
- Adiciona a interação ao histórico
- Caso o chamado esteja encerrado e ainda possua reaberturas disponíveis, ele é reaberto automaticamente

---

### Chamados Pessoais

Além dos chamados tradicionais entre departamentos, o sistema permite que o próprio usuário abra chamados para si mesmo.

Essa funcionalidade possibilita utilizar o sistema também como um gerenciador de tarefas pessoais, mantendo em um único ambiente tanto as demandas recebidas quanto as atividades individuais.

Características:

- Criação através de um modal dedicado
- Utiliza o mesmo fluxo de acompanhamento dos demais chamados
- Facilita a organização de demandas pessoais utilizando a estrutura de tickets

---

## Fluxo do Chamado

```text
ABERTO
   │
   ▼
EM ATENDIMENTO
   │
   ▼
ENCERRADO
   │
   ├── Nova mensagem do solicitante
   │
   ▼
REABERTO (máximo de 2 vezes)
   │
   ▼
EM ATENDIMENTO
   │
   ▼
ENCERRADO
```

# Telas do Sistema

## Gerenciamento de Chamados

Tela principal utilizada pelos administradores e equipes de atendimento para gerenciamento completo dos chamados, contendo filtros, pesquisa, indicadores, ações rápidas e acesso às informações detalhadas de cada ticket.

<img width="1364" height="767" alt="Gerenciamento de Chamados" src="https://github.com/user-attachments/assets/4adfbaae-0aa2-4937-8dae-a52a12337660" />

---

## Detalhes do Chamado

Apresenta todas as informações relacionadas ao atendimento, incluindo:

- Dados do solicitante
- Responsável pelo atendimento
- Histórico completo de ações
- Conversa entre os participantes
- Alterações de status
- Informações de abertura, atribuição e encerramento
- Ações disponíveis conforme o estado atual do chamado

<img width="1365" height="767" alt="Detalhes do Chamado" src="https://github.com/user-attachments/assets/de7b8810-b867-4060-919d-56d68a4d0557" />

---

## Visualização Kanban

O sistema possui uma visualização em Kanban para facilitar o acompanhamento visual do fluxo de atendimento.

Os cartões podem ser agrupados dinamicamente por:

- Status
- Prioridade
- Departamento
- Tópico de Ajuda

<img width="1365" height="767" alt="Kanban" src="https://github.com/user-attachments/assets/c1f72e4f-47c2-42b8-a514-515961cb5899" />

---

## Gerenciamento de Usuários

Tela destinada à administração dos usuários do sistema.

Permite:

- Cadastro de usuários
- Edição de informações
- Ativação e inativação
- Controle de perfis de acesso

<img width="1360" height="609" alt="Gerenciamento de Usuários" src="https://github.com/user-attachments/assets/fc318fe6-ef63-4286-96fd-1a86b107c626" />

---

## Criação de Chamados Pessoais

O usuário pode criar rapidamente uma tarefa pessoal através de um modal dedicado, utilizando o próprio sistema de chamados como organizador de demandas individuais.

<img width="918" height="522" alt="Chamados Pessoais" src="https://github.com/user-attachments/assets/2983f19c-d766-4f88-a90c-913a104bd7a9" />

---

## Portal do Usuário

Além da interface administrativa, o sistema possui uma interface exclusiva para o usuário solicitante.

Nessa tela o usuário pode:

- Abrir novos chamados
- Selecionar o tópico de ajuda
- Informar assunto, descrição e ramal
- Acompanhar o andamento de todos os seus chamados
- Visualizar o status atual de cada solicitação
- Consultar o histórico de mensagens e interagir com a equipe de atendimento
- Reabrir um chamado, quando permitido pelas regras de negócio

<p align="center">
  <img src="https://github.com/user-attachments/assets/9670e2db-e999-4290-83d9-d7601a935b02" width="49%" />
  <img src="https://github.com/user-attachments/assets/1412475e-1e48-403f-9d20-8b542a5c0cde" width="49%" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/c20ae8c2-d0df-4f92-b937-3c3612d7763a" width="49%" />
  <img src="https://github.com/user-attachments/assets/d0cd3467-871d-4be1-a79f-867bcd25d4a2" width="49%" />
</p>
