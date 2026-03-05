import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from "ai";
import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";
import { auth } from "../lib/auth.js";
import { AiBodySchema, ErrorSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetUserTrainData } from "../usecases/GetUserTrainData.js";
import { ListWorkoutPlans } from "../usecases/ListWorkoutPlans.js";
import { UpsertUserTrainData } from "../usecases/UpsertUserTrainData.js";

const systemPrompt = `Você é um personal trainer virtual especialista em montagem de planos de treino personalizados.

## Personalidade
- Tom amigável, motivador, linguagem simples, sem jargões técnicos.
- O principal público são pessoas leigas em musculação.
- Respostas curtas e objetivas.

## Fluxo obrigatório
- **SEMPRE** chame a tool getUserTrainData antes de qualquer interação com o usuário.
- Se o usuário **não tem dados cadastrados** (retornou null): pergunte nome, peso (kg), altura (cm), idade e % de gordura corporal. Perguntas simples e diretas, em uma única mensagem. Após receber as respostas, salve com a tool updateUserTrainData (converta peso de kg para gramas, ou seja, multiplique por 1000).
- Se o usuário **já tem dados**: cumprimente pelo nome.

## Criar plano de treino
- Pergunte objetivo, dias disponíveis por semana e restrições físicas/lesões. Poucas perguntas, simples e diretas.
- O plano DEVE ter exatamente 7 dias (MONDAY a SUNDAY). Dias sem treino = isRest: true, exercises: [], estimatedDurationInSeconds: 0.
- Chame a tool createWorkoutPlan para criar o plano de treino.

## Divisões de treino (Splits)
Escolha a divisão adequada com base nos dias disponíveis:
- **2-3 dias/semana**: Full Body ou ABC (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas+Ombros)
- **4 dias/semana**: Upper/Lower (recomendado, cada grupo 2x/semana) ou ABCD (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas, D: Ombros+Abdômen)
- **5 dias/semana**: PPLUL — Push/Pull/Legs + Upper/Lower (superior 3x, inferior 2x/semana)
- **6 dias/semana**: PPL 2x — Push/Pull/Legs repetido

## Princípios gerais de montagem
- Músculos sinérgicos juntos (peito+tríceps, costas+bíceps)
- Exercícios compostos primeiro, isoladores depois
- 4 a 8 exercícios por sessão
- 3-4 séries por exercício. 8-12 reps (hipertrofia), 4-6 reps (força)
- Descanso entre séries: 60-90s (hipertrofia), 2-3min (compostos pesados)
- Evitar treinar o mesmo grupo muscular em dias consecutivos
- Nomes descritivos para cada dia (ex: "Superior A - Peito e Costas", "Descanso")

## Imagens de capa (coverImageUrl)
SEMPRE forneça um coverImageUrl para cada dia de treino. Escolha com base no foco muscular:

**Dias majoritariamente superiores** (peito, costas, ombros, bíceps, tríceps, push, pull, upper, full body):
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO3y8pQ6GBg8iqe9pP2JrHjwd1nfKtVSQskI0v
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOW3fJmqZe4yoUcwvRPQa8kmFprzNiC30hqftL

**Dias majoritariamente inferiores** (pernas, glúteos, quadríceps, posterior, panturrilha, legs, lower):
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOgCHaUgNGronCvXmSzAMs1N3KgLdE5yHT6Ykj
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO85RVu3morROwZk5NPhs1jzH7X8TyEvLUCGxY

Alterne entre as duas opções de cada categoria para variar. Dias de descanso usam imagem de superior.`;

export const aiRoutes = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["AI"],
      summary: "Chat with AI personal trainer",
      body: AiBodySchema,
      response: {
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "UNAUTHORIZED",
        });
      }

      const userId = session.user.id;
      const messages = request.body.messages as unknown as UIMessage[];

      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        tools: {
          getUserTrainData: tool({
            description: "Busca os dados de treino do usuário autenticado. SEMPRE chame esta tool antes de qualquer interação.",
            inputSchema: z.object({}),
            execute: async () => {
              const getUserTrainData = new GetUserTrainData();
              return getUserTrainData.execute({ userId });
            },
          }),
          updateUserTrainData: tool({
            description: "Atualiza os dados de treino do usuário autenticado.",
            inputSchema: z.object({
              weightInGrams: z.number().describe("Peso do usuário em gramas"),
              heightInCentimeters: z.number().describe("Altura do usuário em centímetros"),
              age: z.number().describe("Idade do usuário"),
              bodyFatPercentage: z.int().min(0).max(100).describe("Percentual de gordura corporal (0 a 100)"),
            }),
            execute: async (input) => {
              const upsertUserTrainData = new UpsertUserTrainData();
              return upsertUserTrainData.execute({
                userId,
                weightInGrams: input.weightInGrams,
                heightInCentimeters: input.heightInCentimeters,
                age: input.age,
                bodyFatPercentage: input.bodyFatPercentage,
              });
            },
          }),
          getWorkoutPlans: tool({
            description: "Lista os planos de treino do usuário autenticado.",
            inputSchema: z.object({}),
            execute: async () => {
              const listWorkoutPlans = new ListWorkoutPlans();
              return listWorkoutPlans.execute({ userId });
            },
          }),
          createWorkoutPlan: tool({
            description: "Cria um novo plano de treino completo para o usuário.",
            inputSchema: z.object({
              name: z.string().describe("Nome do plano de treino"),
              workoutDays: z
                .array(
                  z.object({
                    name: z.string().describe("Nome do dia (ex: Peito e Tríceps, Descanso)"),
                    weekDay: z.enum(WeekDay).describe("Dia da semana"),
                    isRest: z.boolean().describe("Se é dia de descanso (true) ou treino (false)"),
                    estimatedDurationInSeconds: z.number().describe("Duração estimada em segundos (0 para dias de descanso)"),
                    coverImageUrl: z.string().url().describe("URL da imagem de capa do dia de treino. Usar as URLs de superior ou inferior conforme o foco muscular do dia."),
                    exercises: z
                      .array(
                        z.object({
                          order: z.number().describe("Ordem do exercício no dia"),
                          name: z.string().describe("Nome do exercício"),
                          sets: z.number().describe("Número de séries"),
                          reps: z.number().describe("Número de repetições"),
                          restTimeInSeconds: z.number().describe("Tempo de descanso entre séries em segundos"),
                        }),
                      )
                      .describe("Lista de exercícios (vazia para dias de descanso)"),
                  }),
                )
                .describe("Array com exatamente 7 dias de treino (MONDAY a SUNDAY)"),
            }),
            execute: async (input) => {
              const createWorkoutPlan = new CreateWorkoutPlan();
              return createWorkoutPlan.execute({
                userId,
                name: input.name,
                workoutDays: input.workoutDays,
              });
            },
          }),
        },
        stopWhen: stepCountIs(5),
        messages: await convertToModelMessages(messages),
      });

      const response = result.toUIMessageStreamResponse();
      reply.raw.writeHead(response.status, Object.fromEntries(response.headers));
      const reader = response.body?.getReader();
      if (reader) {
        const pump = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done) {
            reply.raw.end();
            return;
          }
          reply.raw.write(value);
          return pump();
        };
        await pump();
      }
      return reply.hijack();
    },
  });
};
