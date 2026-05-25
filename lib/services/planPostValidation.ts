import type { DietPlan, UserProfile, WorkoutPlan, WorkoutDay } from '@/lib/types';
import { buildUserContext } from './aiPromptBuilder';
import { filterMealsWithFullContext } from './mealService';
import { filterWorkoutWithFullContext } from './workoutService';

export function postValidateDietPlan(dietPlan: DietPlan | undefined, profile: UserProfile): DietPlan | undefined {
  if (!dietPlan?.weeklyDietPlan) return dietPlan;

  const context = buildUserContext(profile);
  const weeklyDietPlan = Object.fromEntries(
    Object.entries(dietPlan.weeklyDietPlan).map(([day, meals]) => [day, filterMealsWithFullContext(meals, context)])
  );

  return { ...dietPlan, weeklyDietPlan };
}

function ensureSafeWorkoutDay(day: WorkoutDay | string[]): WorkoutDay | string[] {
  if (Array.isArray(day)) {
    return day.length ? day : ['Легкая активность: прогулка 20-30 минут'];
  }

  if (day.type === 'workout' && (!day.exercises || day.exercises.length === 0)) {
    return {
      ...day,
      type: 'light-activity',
      lightActivity: day.lightActivity ?? 'Прогулка 20-30 минут и мягкая мобильность',
      exercises: [],
    };
  }

  return day;
}

export function postValidateWorkoutPlan(workoutPlan: WorkoutPlan | undefined, profile: UserProfile): WorkoutPlan | undefined {
  if (!workoutPlan?.weeklyWorkoutPlan) return workoutPlan;

  const context = buildUserContext(profile);
  const weeklyWorkoutPlan = Object.fromEntries(
    Object.entries(workoutPlan.weeklyWorkoutPlan).map(([day, plan]) => {
      const filtered = filterWorkoutWithFullContext(plan, context);
      return [day, ensureSafeWorkoutDay(filtered)];
    })
  );

  return { ...workoutPlan, weeklyWorkoutPlan };
}

