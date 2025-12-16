## API RESTful desenvolvida em **Node.js + TypeScript + Express + TypeORM**, conectada ao **MySQL**

## Funcionalidades

- CRUD completo para gerenciamento de entidades (usuários, produtos e situações)  
- Autenticação de usuários com **JWT (JSON Web Token)**  
- Criptografia de senhas utilizando **bcryptjs**  
- Validação de dados e formulários com **Yup**  
- Envio de e-mails para recuperação de senha com **Nodemailer**  
- Conversão automática de nomes em **slugs** para URLs amigáveis  
- Criação e atualização do banco de dados via **migrations**  
- Inserção de dados iniciais através de **seeds**


# Guia:

## Criar o arquivo package.json

```bash
npm init
```

## Instalar o Express para gerenciar as requisições, rotas e URLs, entre outros

```bash
npm i typeorm --save
npm i reflect-metadata --save
npm i mysql2 --save
```

## Manipular variáveis de ambiente

```bash
npm i dotenv --save
```

## Instalar os pacotes para suporte ao TypeScript

```bash
npm i --save-dev @types/express
npm i --save-dev @types/node

```

## Instalar os tipos de variáveis para o TypeScript

```bash
npm i --save-dev @types/dotenv
```

## Instalar a dependência para rodar processos simultâneos

```bash
npm i --save-dev concurrently
```

## Instalar o compilador de projeto com o TypeScript e reiniciar o projeto quando o arquivo for modificado

```bash
npm i --save-dev ts-node
```

## Criar base de dados no MySQL

```bash
CREATE DATABASE nodeapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Criar a migração que sera usada para criar a tabela no banco de dados

```
npx typeorm migration:create src/migration/CreateSituationsTable

npx typeorm migration:create src/migration/CreateUsersTable

npx typeorm migration:create src/migration/CreateCategoryProdutsTable

npx typeorm migration:create src/migration/AddPasswordToUsers

npx typeorm migration:create src/migration/AddSlugToProducts
npx typeorm migration:create src/migration/AddRecoverPasswordToUsers

```

## Executar as migrations para criar as tabelas no banco de dados.

```bash
npx typeorm migration:run -d dist/data-source.js

```

## executar as seeds para cadastrar registro de teste nas tabelaas no banco de dados.

```
node dist/run-seeds.js

```

## Compilar o arquivo TypeScript

```bash
npx tsc
```

### Executar o arquivo gerado com Node.js

```bash
node dist/index.js

###Compilar

npm run start:watch

```

### validacao de formulario

```bash
npm i yup
```
### permitir requisição externa

```bash
npm i cors
npm install --save-dev @types/cors
```
### converter o slug automaticamente antes de salvar no banco de dados

```
npm install slugify
```
### instalar o bcryptjs.
```
npm install --save-dev @types/bcryptjs


```
### instalar dependecia jwt pra manipular token de autenticacao.
```
npm install jsonwebtoken
```
npm i --save-dev @types/jsonwebtoken
```
### instalado nodemailer.
```
npm install --save-dev @types/nodemailer
```