import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
}

interface OutputDto {
  userId: string;
  userName: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 1 representa 100%
}

export class GetUserTrainData {
  async execute(dto: InputDto): Promise<OutputDto | null> {
    const user = await prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user || user.weightInGrams === null || user.heightInCentimeters === null || user.age === null || user.bodyFatPercentage === null) {
      return null;
    }

    return {
      userId: user.id,
      userName: user.name,
      weightInGrams: user.weightInGrams,
      heightInCentimeters: user.heightInCentimeters,
      age: user.age,
      bodyFatPercentage: user.bodyFatPercentage,
    };
  }
}
