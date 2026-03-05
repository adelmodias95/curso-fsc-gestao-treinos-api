import dayjs from "dayjs";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt: string;
}

interface OutputDto {
  id: string;
  completedAt: string;
  startedAt: string;
}

export class CompleteWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: {
        workoutDays: {
          where: { id: dto.workoutDayId },
          include: {
            sessions: {
              where: { id: dto.sessionId },
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

    const workoutDay = workoutPlan.workoutDays[0];

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    const workoutSession = workoutDay.sessions[0];

    if (!workoutSession) {
      throw new NotFoundError("Workout session not found");
    }

    const updated = await prisma.workoutSession.update({
      where: { id: dto.sessionId },
      data: {
        completedAt: dayjs(dto.completedAt).toDate(),
      },
    });

    return {
      id: updated.id,
      completedAt: dayjs(updated.completedAt).toISOString(),
      startedAt: dayjs(updated.startedAt).toISOString(),
    };
  }
}
