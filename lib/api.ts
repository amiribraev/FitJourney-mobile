import { auth } from './firebase';
import type { DietPlan, Goal, Gender, WorkoutPlan } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:9002';
const REQUEST_TIMEOUT_MS = 20000;

export type PlanGenerateInput = {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
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
