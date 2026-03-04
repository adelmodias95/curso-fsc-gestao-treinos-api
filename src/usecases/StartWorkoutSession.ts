import { ConflictError, NotFoundError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

export interface StartWorkoutSessionOutput {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto): Promise<StartWorkoutSessionOutput> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: {
        workoutDays: {
          where: { id: dto.workoutDayId },
          include: {
            sessions: {
              where: { completedAt: null },
            },
          },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError();
    }

    const workoutDay = workoutPlan.workoutDays[0];

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    if (workoutDay.sessions.length > 0) {
      throw new ConflictError("Workout day already has an active session");
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: dto.workoutDayId,
        startedAt: new Date(),
      },
    });

    return { userWorkoutSessionId: session.id };
  }
}
