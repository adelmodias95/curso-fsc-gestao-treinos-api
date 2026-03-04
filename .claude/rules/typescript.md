---
paths:
  - "**/*.ts"
---

# Regras TypeScript

## Princípios Básicos

- **SEMPRE** use TypeScript para escrever código. Não use JavaScript em **hipótese alguma**.
- **NUNCA** use `any`.
- **SEMPRE** prefira named exports ao invés de default exports, a menos quando estritamente necessário.

## Funções

- **SEMPRE** use arrow functions ao invés de funções convencionais, a menos quando estritamente necessário.
- **SEMPRE** nomeie funções como verbos.
- **SEMPRE** prefira early returns ao invés de ifs muito aninhados.
- Priorize usar higher-order functions ao invés de loops (map, filter, reduce etc.).
- Ao receber mais de 2 parâmetros, **SEMPRE** receba um objeto.

## Nomenclatura

- **SEMPRE** prefira `interface` ao invés de `type`, a menos quando estritamente necessário.
- **SEMPRE** use kebab-case para nomear arquivos (e.g ./lib/auth-client.ts) com exeção de use cases (use PascalCase).
- **SEMPRE** use PascalCase para nomear classes.
- **SEMPRE** use camelCase para nomear variáveis, funções e métodos.

## Datas

- SEMPRE use a biblioteca "dayjs" para manipular e formatar datas.

## Zod

- **SEMPRE** use Zod v4.
- Busque sempre validar os dados com o Zod da melhor maneira possível. Exemplo: use z.url(), z.date() etc.
- **SEMPRE** use os validadores de data ISO do Zod ao invés de regex manuais: `z.iso.date()` para datas (YYYY-MM-DD), `z.iso.datetime()` para timestamps ISO, `z.iso.time()` para horários e `z.iso.duration()` para durações.
