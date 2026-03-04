# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (with hot reload)
npm run dev

# Start PostgreSQL database
docker compose up -d

# Prisma migrations
npx prisma migrate dev       # create and apply a migration
npx prisma migrate deploy    # apply pending migrations in production
npx prisma generate          # regenerate Prisma client (outputs to src/generated/prisma/)

# Lint
npx eslint .
```

Required env vars: `DATABASE_URL`, `PORT` (see `.env`).

## Architecture

This is a **Fastify + TypeScript REST API** for workout plan management, following a use-case pattern.

**Stack:**
- **Fastify 5** with `fastify-type-provider-zod` for request/response validation
- **Prisma 7** with PostgreSQL (pg adapter), client output at `src/generated/prisma/`
- **better-auth** for authentication (email/password), exposed at `/api/auth/*`
- **Zod** for schema definition and validation
- **Scalar** (`/docs`) for API documentation (two sources: main API + better-auth OpenAPI)

**Request flow:**
1. `src/index.ts` — bootstraps Fastify, registers plugins (CORS, Swagger, Scalar, auth handler), registers route plugins
2. `src/routes/` — Fastify route handlers; validate sessions via `better-auth`, delegate to use cases
3. `src/usecases/` — business logic classes with an `execute(dto)` method; interact directly with `prisma`
4. `src/schemas/index.ts` — shared Zod schemas for request/response typing
5. `src/errors/index.ts` — custom error classes (`NotFoundError`, etc.)
6. `src/lib/db.ts` — singleton `PrismaClient` instance (global cache prevents multiple instances during hot reload)
7. `src/lib/auth.ts` — `better-auth` configuration using Prisma adapter

**Key patterns:**
- All imports use `.js` extension (ESM with `"module": "nodenext"`)
- Route files export an `async (fastify: FastifyInstance)` function registered with a prefix in `src/index.ts`
- Use cases are classes; add new ones in `src/usecases/` following `CreateWorkoutPlan.ts`
- Auth check in route handlers: `auth.api.getSession({ headers: fromNodeHeaders(request.headers) })`
- Prisma client is auto-generated — run `npx prisma generate` after schema changes

**Database:** PostgreSQL on port `5433` (mapped from container's `5432`). Connection via `DATABASE_URL` env var.
