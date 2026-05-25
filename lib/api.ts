import { auth } from './firebase';
import type { DietPlan, Goal, Gender, WorkoutPlan } from './types';
import type { UserProfile } from '@/lib/types';
import type { Language } from '@/lib/i18n/types';
import { generateLocalPlans } from '@/lib/services/localPlanGenerator';
import { postValidateDietPlan, postValidateWorkoutPlan } from '@/lib/services/planPostValidation';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:9002';
const REQUEST_TIMEOUT_MS = 20000;
const MOJIBAKE_PATTERN = /(?:Ð|Ñ|PSC|(?:Р.|С.){3,})/;

export type PlanGenerateInput = {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  allergies?: string[];
  intolerances?: string[];
  dietRestriction?: string;
  foodPreferences?: string[];
  injuries?: string[];
  loadRestrictions?: string[];
  fitnessLevel?: string;
  equipment?: string;
  workoutGoals?: string[];
  language?: Language;
  types?: ('diet' | 'workout')[];
};

function toOrigin(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildApiCandidates(baseUrl: string): string[] {
  const normalized = toOrigin(baseUrl);
  const candidates = [normalized];

  if (normalized.includes('localhost')) {
    candidates.push(normalized.replace('localhost', '10.0.2.2'));
    candidates.push(normalized.replace('localhost', '127.0.0.1'));
  }

  if (normalized.includes('127.0.0.1')) {
    candidates.push(normalized.replace('127.0.0.1', '10.0.2.2'));
    candidates.push(normalized.replace('127.0.0.1', 'localhost'));
  }

  return Array.from(new Set(candidates));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function hasMojibake(value: unknown): boolean {
  if (typeof value === 'string') return MOJIBAKE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some((item) => hasMojibake(item));
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some((item) => hasMojibake(item));
  return false;
}

function assertNoMojibake(plans: { dietPlan?: DietPlan; workoutPlan?: WorkoutPlan }) {
  if (hasMojibake(plans.dietPlan) || hasMojibake(plans.workoutPlan)) {
    throw new Error('PLAN_MOJIBAKE');
  }
}
export async function generatePlans(input: PlanGenerateInput): Promise<{
  dietPlan?: DietPlan;
  workoutPlan?: WorkoutPlan;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Необходимо войти в аккаунт');

  const token = await user.getIdToken();
  const body = JSON.stringify({
    ...input,
    types: input.types ?? ['diet', 'workout'],
  });

  const candidates = buildApiCandidates(API_URL);
  let response: Response | null = null;

  for (const candidate of candidates) {
    try {
      response = await fetchWithTimeout(`${candidate}/api/plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      break;
    } catch {
      // Try next candidate URL.
    }
  }

  if (!response) {
    const addresses = candidates.join(', ');
    throw new Error(
      `Сервер генерации недоступен. Проверьте, что backend запущен на одном из адресов: ${addresses}. Текущий EXPO_PUBLIC_API_URL: ${API_URL}`
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status >= 500) {
      throw new Error('Сервер генерации ответил ошибкой. Проверьте логи backend.');
    }
    throw new Error((data as { error?: string }).error ?? 'Ошибка генерации планов');
  }

  return response.json();
}

export async function generatePlansWithFallback(
  profile: UserProfile,
  preferLocal: boolean = false
): Promise<{ dietPlan?: DietPlan; workoutPlan?: WorkoutPlan }> {
  const input: PlanGenerateInput = {
    age: profile.age,
    gender: profile.gender,
    weight: profile.weight,
    height: profile.height,
    goal: profile.goal,
    allergies: profile.allergies,
    intolerances: profile.intolerances,
    dietRestriction: profile.dietRestriction,
    foodPreferences: profile.foodPreferences,
    injuries: profile.injuries,
    loadRestrictions: profile.loadRestrictions,
    fitnessLevel: profile.fitnessLevel,
    equipment: profile.equipment,
    workoutGoals: profile.workoutGoals,
    language: profile.language,
  };

  if (preferLocal) {
    const localPlans = generateLocalPlans(profile);
    const result = {
      dietPlan: postValidateDietPlan(localPlans.dietPlan, profile),
      workoutPlan: postValidateWorkoutPlan(localPlans.workoutPlan, profile),
    };
    assertNoMojibake(result);
    return result;
  }

  try {
    const remotePlans = await generatePlans(input);
    const result = {
      dietPlan: postValidateDietPlan(remotePlans.dietPlan, profile),
      workoutPlan: postValidateWorkoutPlan(remotePlans.workoutPlan, profile),
    };
    assertNoMojibake(result);
    return result;
  } catch {
    const localPlans = generateLocalPlans(profile);
    const result = {
      dietPlan: postValidateDietPlan(localPlans.dietPlan, profile),
      workoutPlan: postValidateWorkoutPlan(localPlans.workoutPlan, profile),
    };
    assertNoMojibake(result);
    return result;
  }
}
