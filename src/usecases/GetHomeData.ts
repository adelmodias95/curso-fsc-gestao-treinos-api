import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  date: string;
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl: string | null;
    exercisesCount: number;
  };
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
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

export class GetHomeData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const date = dayjs.utc(dto.date);
    const todayWeekDay = WEEKDAY_MAP[date.day()];

    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (!activeWorkoutPlan) {
      throw new NotFoundError("Active workout plan not found");
    }

    const todayWorkoutDay = activeWorkoutPlan.workoutDays.find((day) => day.weekDay === todayWeekDay);

    if (!todayWorkoutDay) {
      throw new NotFoundError("Workout day not found for today");
    }

    // Calculate week range (Sunday to Saturday) in UTC
    const weekStart = date.startOf("week").toDate(); // Sunday 00:00:00
    const weekEnd = date.endOf("week").toDate(); // Saturday 23:59:59

    // Fetch all sessions for this user within the week range
    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
            isActive: true,
          },
        },
        startedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // Build consistencyByDay for all 7 days of the week
    const consistencyByDay: OutputDto["consistencyByDay"] = {};

    for (let i = 0; i < 7; i++) {
      const dayDate = dayjs.utc(weekStart).add(i, "day");
      const dayKey = dayDate.format("YYYY-MM-DD");

      const daySessions = sessions.filter((s) => dayjs.utc(s.startedAt).format("YYYY-MM-DD") === dayKey);

      const workoutDayStarted = daySessions.length > 0;
      const workoutDayCompleted = daySessions.some((s) => s.completedAt !== null);

      consistencyByDay[dayKey] = { workoutDayCompleted, workoutDayStarted };
    }

    // Calculate workout streak
    const workoutStreak = await this.calculateStreak(dto.userId, date);

    return {
      activeWorkoutPlanId: activeWorkoutPlan.id,
      todayWorkoutDay: {
        workoutPlanId: activeWorkoutPlan.id,
        id: todayWorkoutDay.id,
        name: todayWorkoutDay.name,
        isRest: todayWorkoutDay.isRest,
        weekDay: todayWorkoutDay.weekDay,
        estimatedDurationInSeconds: todayWorkoutDay.estimatedDurationInSeconds,
        coverImageUrl: todayWorkoutDay.coverImageUrl,
        exercisesCount: todayWorkoutDay.exercises.length,
      },
      workoutStreak,
      consistencyByDay,
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

    // Build a set of weekdays that have workout days in the plan
    const planWeekDays = new Set(activeWorkoutPlan.workoutDays.map((d) => d.weekDay));

    // Get rest day weekdays
    const restDayWeekDays = new Set(activeWorkoutPlan.workoutDays.filter((d) => d.isRest).map((d) => d.weekDay));

    let streak = 0;
    let currentDate = fromDate;

    // Walk backwards day by day
    for (let i = 0; i < 365; i++) {
      const dayWeekDay = WEEKDAY_MAP[currentDate.day()];

      // If this day is not in the plan, skip it (doesn't break or count)
      if (!planWeekDays.has(dayWeekDay)) {
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      // If it's a rest day, it counts automatically
      if (restDayWeekDays.has(dayWeekDay)) {
        streak++;
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      // Check if there's a completed session for this day
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
