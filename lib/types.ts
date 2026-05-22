export type Gender = 'male' | 'female';
export type Goal = 'weight loss' | 'muscle gain';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  dietPlan?: DietPlan;
  workoutPlan?: WorkoutPlan;
  createdAt: string;
};

export type Meal = {
  mealType: 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус';
  meal: string;
  calories: number;
  budget: number;
  protein?: number;
};

export type DietPlan = {
  weeklyDietPlan: Record<string, Meal[]>;
};

export type WorkoutPlan = {
  weeklyWorkoutPlan: Record<string, string[]>;
};

export type ProgressLog = {
  id: string;
  userId: string;
  date: string;
  caloriesConsumed: number;
  workoutCompleted?: boolean;
};

export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const DAY_LABELS: Record<string, string> = {
  Monday: 'Понедельник',
  Tuesday: 'Вторник',
  Wednesday: 'Среда',
  Thursday: 'Четверг',
  Friday: 'Пятница',
  Saturday: 'Суббота',
  Sunday: 'Воскресенье',
};
