import { db } from '@/lib/firebase';
import type { CalorieSourceEntry, ProgressLog } from '@/lib/types';

export const CALORIE_CAMERA_DAILY_LIMIT = 3;

export type CalorieSaveInput = {
  uid: string;
  dayId: string;
  totalCalories?: number;
  breakfastCalories?: number;
  lunchCalories?: number;
  dinnerCalories?: number;
  calorieInputMode: 'total' | 'split';
};

function parseDayId(dayId: string) {
  const [y, m, d] = dayId.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function deriveCalories(input: Omit<CalorieSaveInput, 'uid' | 'dayId'>) {
  if (input.calorieInputMode === 'total') {
    return Math.max(0, input.totalCalories ?? 0);
  }
  return Math.max(0, (input.breakfastCalories ?? 0) + (input.lunchCalories ?? 0) + (input.dinnerCalories ?? 0));
}

export async function saveCaloriesForDay(existing: ProgressLog | undefined, input: CalorieSaveInput) {
   const ref = db.collection('users').doc(input.uid).collection('progressLogs').doc(input.dayId);
   const now = new Date().toISOString();
   const caloriesConsumed = deriveCalories(input);

   const payload: Partial<ProgressLog> = {
     id: input.dayId,
     userId: input.uid,
     date: parseDayId(input.dayId).toISOString(),
     caloriesConsumed,
     calorieInputMode: input.calorieInputMode,
     calorieSources: existing?.calorieSources ?? [],
     caloriesBurned: existing?.caloriesBurned ?? 0,
     workoutCompleted: existing?.workoutCompleted ?? false,
     workoutId: existing?.workoutId ?? '',
     notes: existing?.notes ?? '',
     createdAt: existing?.createdAt ?? now,
     isHidden: false
   };

   if (input.calorieInputMode === 'total') {
     payload.totalCalories = input.totalCalories;
   } else {
     payload.breakfastCalories = input.breakfastCalories;
     payload.lunchCalories = input.lunchCalories;
     payload.dinnerCalories = input.dinnerCalories;
   }

   await ref.set(payload, { merge: true });
 }

export async function deleteSingleSource(uid: string, dayId: string, existing: ProgressLog | undefined, sourceIndex: number) {
  if (!existing?.calorieSources?.[sourceIndex]) return;
  
  const newSources = existing.calorieSources.filter((_, i) => i !== sourceIndex);
  const removedCalories = existing.calorieSources[sourceIndex].calories;
  const newTotal = Math.max(0, (existing.caloriesConsumed ?? 0) - removedCalories);
  
  await db.collection('users').doc(uid).collection('progressLogs').doc(dayId).update({
    caloriesConsumed: newTotal,
    calorieSources: newSources,
    totalCalories: (existing.totalCalories ?? 0) - removedCalories,
  });
}

export async function deleteCaloriesForDay(uid: string, dayId: string) {
   await db.collection('users').doc(uid).collection('progressLogs').doc(dayId).update({
     isHidden: true
   });
 }

export function getCameraTransfersCount(log: ProgressLog | undefined) {
  return (log?.calorieSources ?? []).filter((entry) => entry.source === 'calorie-camera').length;
}

export async function appendCalorieCameraEntry(uid: string, dayId: string, existing: ProgressLog | undefined, calories: number) {
  const current = existing?.calorieSources ?? [];
  const cameraEntries = current.filter((entry) => entry.source === 'calorie-camera');

  if (cameraEntries.length >= CALORIE_CAMERA_DAILY_LIMIT) {
    return { ok: false as const, reason: 'limit' as const };
  }

  const duplicate = cameraEntries.some((entry) => entry.calories === calories);
  if (duplicate) {
    return { ok: false as const, reason: 'duplicate' as const };
  }

  const entry: CalorieSourceEntry = {
    source: 'calorie-camera',
    calories,
    createdAt: new Date().toISOString(),
    note: '????????? ????? Calorie Camera',
  };

  const baseTotal = existing?.caloriesConsumed ?? 0;
  const nextLog: Partial<ProgressLog> = {
    id: dayId,
    userId: uid,
    date: parseDayId(dayId).toISOString(),
    caloriesConsumed: baseTotal + calories,
    totalCalories: (existing?.totalCalories ?? 0) + calories,
    calorieInputMode: existing?.calorieInputMode ?? 'total',
    calorieSources: [...current, entry],
    caloriesBurned: existing?.caloriesBurned ?? 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  await db.collection('users').doc(uid).collection('progressLogs').doc(dayId).set(nextLog, { merge: true });

  return { ok: true as const };
}
