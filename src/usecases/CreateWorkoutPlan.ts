// use case: é uma classe que representa uma operação de negócio
import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

// dto: Data Transfer Object
interface inputDto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string | null;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export interface CreateWorkoutPlanOutput {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  workoutDays: Array<{
    id: string;
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    coverImageUrl: string | null;
    workoutPlanId: string;
    exercises: Array<{
      id: string;
      name: string;
      order: number;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
      workoutDayId: string;
    }>;
  }>;
}

export class CreateWorkoutPlan {
  async execute(dto: inputDto): Promise<CreateWorkoutPlanOutput> {
    const existingWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        isActive: true,
      },
    });

    // Transaction: é uma operação que é executada em uma única unidade de trabalho e é garantida como um todo.
    // Garantir Atomicidade: é garantir que a operação seja executada completa ou não seja executada.
    // ACID: Atomicidade, Consistência, Isolamento, Durabilidade
    return prisma.$transaction(async (tx) => {
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: {
            id: existingWorkoutPlan.id,
          },
          data: {
            isActive: false,
          },
        });
      }
      const workOutPlan = await tx.workoutPlan.create({
        data: {
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          workoutDays: {
            create: dto.workoutDays.map((workoutDay) => ({
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              isRest: workoutDay.isRest,
              estimatedDurationInSeconds: Number(workoutDay.estimatedDurationInSeconds),
              coverImageUrl: workoutDay.coverImageUrl ?? null,
              exercises: {
                create: workoutDay.exercises.map((exercise) => ({
                  name: exercise.name,
                  order: exercise.order,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: Number(exercise.restTimeInSeconds),
                })),
              },
            })),
          },
        },
      });
      const result = await tx.workoutPlan.findUnique({
        where: { id: workOutPlan.id },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundError("Workout plan not found");
      }

      return result;
    });
  }
}
