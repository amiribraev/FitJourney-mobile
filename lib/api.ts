import { auth } from './firebase';
import type { DietPlan, Goal, Gender, WorkoutPlan } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:9002';

export type PlanGenerateInput = {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  types?: ('diet' | 'workout')[];
};

export async function generatePlans(input: PlanGenerateInput): Promise<{
  dietPlan?: DietPlan;
  workoutPlan?: WorkoutPlan;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Необходимо войти в аккаунт');

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/plans/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...input,
      types: input.types ?? ['diet', 'workout'],
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Ошибка генерации планов');
  }

  return response.json();
}
