# Template de Prompt para Criar uma Rota de API

Crie a rota `POST /workout-plans/{id}/days/{id}/sessions`

## Descrição

Ela inicia uma sessão de treino de um dia de um plano de treino específico.

## Requisitos Técnicos

- Um dia iniciado representa uma WorkoutSession criada no banco de dados.
- Use case deve se chamar "StartWorkoutSession".

## Autenticação

- Rota protegida.
- Apenas o dono do plano de treino pode iniciar uma sessão de treino.

## Request

```ts
interface Body {}
```

```ts
interface Params {}
```

```ts
interface Query {}
```

## Response

[Descreva o retorno esperado e o status code, por exemplo:]

```ts
interface StatusCode201 {
  userWorkoutSessionId: string;
}
```

## Regras de Negócio

- Apenas o dono do workout plan pode iniciar a sessão de treino.
- Caso o dia recebido já tenha uma sessão iniciada (startedAt presente), retorne 409.
