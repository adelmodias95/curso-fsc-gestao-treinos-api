# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Stack

- Node.js (ES modules)
- NPM como package manager
- TypeScript (target ES2024)
- Fastify com Zod type provider
- Prisma ORM com PostgreSQL (usando pg adapter)
- better-auth para autenticação
- Zod v4

## Comandos

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor dev com watch mode (tsx --watch)

# Build
npm run build                  # Build com tsup

# Banco de dados
npm prisma generate        # Gera o Prisma client (também roda no postinstall)
npm prisma migrate dev     # Executa migrations em desenvolvimento
npm prisma studio          # Abre o Prisma Studio GUI

# Linting
npm eslint .               # Executa ESLint
```

## Arquitetura

### Estrutura de Diretórios

- `src/` - Código fonte da aplicação
  - `lib/db.ts` - Setup do client do banco (Prisma com pg adapter)
  - `entities/` - Interfaces TypeScript para entidades de domínio
  - `errors/` - Arquivos com classes de erro
  - `schemas/` - Schemas Zod para validação de request/response
  - `usecases/` - Classes de lógica de negócio (padrão use case)
  - `generated/` - Prisma client gerado automaticamente (output em `generated/prisma/`)
- `prisma/` - Schema e migrations do Prisma

### Documentação da API

Swagger UI disponível em `/docs` quando o servidor está rodando (porta 3000).

## MCPs

- **SEMPRE** use Context7 para buscar documentações
- **SEMPRE** use Serena para semantic code retrieval e editing tools.
