import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

const WEEKDAY_MAP: Record<number, WeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const from = dayjs.utc(dto.from).startOf("day");
    const to = dayjs.utc(dto.to).endOf("day");

    // Fetch all sessions within the range
    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
            isActive: true,
          },
        },
        startedAt: {
          gte: from.toDate(),
          lte: to.toDate(),
        },
      },
    });

    // Build consistencyByDay — only days that have at least one session
    const consistencyByDay: OutputDto["consistencyByDay"] = {};
    const sessionsByDay = new Map<string, typeof sessions>();

    for (const session of sessions) {
      const dayKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      const existing = sessionsByDay.get(dayKey) ?? [];
      existing.push(session);
      sessionsByDay.set(dayKey, existing);
    }

    for (const [dayKey, daySessions] of sessionsByDay) {
      const workoutDayStarted = daySessions.length > 0;
      const workoutDayCompleted = daySessions.some((s) => s.completedAt !== null);
      consistencyByDay[dayKey] = { workoutDayCompleted, workoutDayStarted };
    }

    // completedWorkoutsCount
    const completedWorkoutsCount = sessions.filter((s) => s.completedAt !== null).length;

    // conclusionRate
    const conclusionRate = sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    // totalTimeInSeconds — sum of (completedAt - startedAt) for completed sessions
    const totalTimeInSeconds = sessions
      .filter((s) => s.completedAt !== null)
      .reduce((acc, s) => {
        const diff = dayjs.utc(s.completedAt).diff(dayjs.utc(s.startedAt), "second");
        return acc + diff;
      }, 0);

    // workoutStreak
    const workoutStreak = await this.calculateStreak(dto.userId, to);

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private async calculateStreak(userId: string, fromDate: dayjs.Dayjs): Promise<number> {
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        workoutDays: true,
      },
    });

    if (!activeWorkoutPlan) {
      return 0;
    }

    const planWeekDays = new Set(activeWorkoutPlan.workoutDays.map((d) => d.weekDay));
    const restDayWeekDays = new Set(activeWorkoutPlan.workoutDays.filter((d) => d.isRest).map((d) => d.weekDay));

    let streak = 0;
    let currentDate = fromDate.startOf("day");

    for (let i = 0; i < 365; i++) {
      const dayWeekDay = WEEKDAY_MAP[currentDate.day()];

      if (!planWeekDays.has(dayWeekDay)) {
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      if (restDayWeekDays.has(dayWeekDay)) {
        streak++;
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      const dayStart = currentDate.startOf("day").toDate();
      const dayEnd = currentDate.endOf("day").toDate();

      const completedSession = await prisma.workoutSession.findFirst({
        where: {
          workoutDay: {
            workoutPlan: {
              userId,
              isActive: true,
            },
          },
          startedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          completedAt: { not: null },
        },
      });

      if (!completedSession) {
        break;
      }

      streak++;
      currentDate = currentDate.subtract(1, "day");
    }

    return streak;
  }
}
