# 🎨 HelpDesk Frontend

Interface web do sistema de gerenciamento de chamados técnicos (tickets) desenvolvida com **Next.js 14**, **TypeScript** e **Tailwind CSS**.

---

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Axios** - Requisições HTTP
- **Context API** - Gerenciamento de estado de autenticação

---

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor de produção
npm start
```

O aplicativo estará disponível em [http://localhost:3001](http://localhost:3001)

---

## ⚙️ Configuração

Crie um arquivo `.env.local` na raiz do projeto:

```env
# URL da API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (páginas e layouts)
│   ├── login/             # Página de login
│   ├── dashboard/         # Dashboard principal
│   ├── layout.tsx         # Layout raiz com AuthProvider
│   └── page.tsx           # Página inicial (redireciona para login)
├── components/            # Componentes reutilizáveis
├── contexts/              # Context API
│   └── AuthContext.tsx   # Contexto de autenticação
├── services/              # Serviços e API
│   └── api.ts            # Instância configurada do Axios
└── types/                 # Definições de tipos TypeScript
    └── auth.ts           # Tipos relacionados à autenticação
```

---

## 🔐 Sistema de Autenticação

### AuthContext

Gerencia o estado global de autenticação:

```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

**Funcionalidades:**
- ✅ Login com email e senha
- ✅ Armazenamento de token JWT no localStorage
- ✅ Persistência de sessão
- ✅ Logout

### Axios Interceptor

Configuração automática do token JWT em todas as requisições:

```typescript
// Interceptor adiciona automaticamente o header Authorization
headers: {
  'Authorization': `Bearer ${token}`
}

// Interceptor trata erro 401 (token expirado/inválido)
// Redireciona automaticamente para /login
```

---

## 🎨 Páginas Implementadas

### `/login`
- Formulário de login com email e senha
- Validação de campos obrigatórios
- Exibição de erros de autenticação
- Link para recuperação de senha
- Redirecionamento automático para `/dashboard` após login bem-sucedido

### `/dashboard`
- Informações do usuário logado
- Botão de logout
- Proteção de rota (redireciona para `/login` se não autenticado)
- Placeholders para estatísticas de chamados

---

## 🛠️ Próximos Passos

- [ ] Implementar tela de recuperação de senha
- [ ] Criar componentes de listagem de chamados
- [ ] Implementar filtros e busca
- [ ] Adicionar formulário de criação de chamados
- [ ] Criar páginas de detalhes do chamado
- [ ] Implementar sistema de mensagens em tempo real
- [ ] Adicionar notificações
- [ ] Criar painel administrativo

---

## 📝 Scripts Disponíveis

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Compila para produção
npm start          # Inicia servidor de produção
npm run lint       # Executa linter ESLint
```

---

## 🤝 Integração com Backend

O frontend consome a API REST do backend HelpDesk:

**Base URL:** `http://localhost:3000`

**Endpoints utilizados:**
- `POST /login` - Autenticação de usuário

---

## 👨‍💻 Desenvolvido por

**Kaue Neto**
- GitHub: [@Kaueneto](https://github.com/Kaueneto)

---

**Desenvolvido com ❤️ usando Next.js + TypeScript + Tailwind CSS**
