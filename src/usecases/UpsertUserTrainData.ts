import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 100 representa 100%
}

interface OutputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 100 representa 100%
}

export class UpsertUserTrainData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const user = await prisma.user.update({
      where: { id: dto.userId },
      data: {
        weightInGrams: dto.weightInGrams,
        heightInCentimeters: dto.heightInCentimeters,
        age: dto.age,
        bodyFatPercentage: dto.bodyFatPercentage,
      },
    });

    return {
      userId: user.id,
      weightInGrams: user.weightInGrams!,
      heightInCentimeters: user.heightInCentimeters!,
      age: user.age!,
      bodyFatPercentage: user.bodyFatPercentage!,
    };
  }
}
