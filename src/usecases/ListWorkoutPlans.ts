import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  active?: boolean;
}

interface OutputDto {
  workoutPlans: Array<{
    id: string;
    name: string;
    isActive: boolean;
    workoutDays: Array<{
      id: string;
      name: string;
      weekDay: WeekDay;
      isRest: boolean;
      coverImageUrl: string | null;
      estimatedDurationInSeconds: number;
      exercises: Array<{
        id: string;
        name: string;
        order: number;
        sets: number;
        reps: number;
        restTimeInSeconds: number;
      }>;
    }>;
  }>;
}

export class ListWorkoutPlans {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlans = await prisma.workoutPlan.findMany({
      where: {
        userId: dto.userId,
        ...(dto.active !== undefined && { isActive: dto.active }),
      },
      include: {
        workoutDays: {
          include: {
            exercises: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      workoutPlans: workoutPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        isActive: plan.isActive,
        workoutDays: plan.workoutDays.map((day) => ({
          id: day.id,
          name: day.name,
          weekDay: day.weekDay,
          isRest: day.isRest,
          coverImageUrl: day.coverImageUrl,
          estimatedDurationInSeconds: day.estimatedDurationInSeconds,
          exercises: day.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            restTimeInSeconds: exercise.restTimeInSeconds,
          })),
        })),
      })),
    };
  }
}
