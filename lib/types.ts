export type Gender = 'male' | 'female';
export type Goal = 'weight loss' | 'muscle gain' | 'maintenance';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'gym' | 'home' | 'no-equipment';
export type DietRestriction = 'none' | 'vegan' | 'vegetarian' | 'halal' | 'kosher' | 'gluten-free' | 'lactose-free';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  fitnessLevel: FitnessLevel;
  equipment: Equipment;
  dietRestriction: DietRestriction;
  allergies: string[];
  injuries: string[];
  tdee: number;
  macros: { protein: number; fat: number; carbs: number };
  dietPlan?: DietPlan;
  workoutPlan?: WorkoutPlan;
  progressLogs: ProgressLog[];
  bodyMeasurements: BodyMeasurement[];
  workoutCalendar: WorkoutCalendarEntry[];
  gamification: GamificationStats;
  createdAt: string;
  updatedAt: string;
};

export type Meal = {
  mealType: 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус';
  meal: string;
  calories: number;
  budget: number;
  protein?: number;
  alternatives?: string[];
};

export type DietPlan = {
  weeklyDietPlan: Record<string, Meal[]>;
  generatedAt: string;
  tdeeUsed: number;
  macrosUsed: { protein: number; fat: number; carbs: number };
};

export type WorkoutExercise = {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restSeconds: number;
  notes?: string;
  equipment?: string;
};

export type WorkoutDay = {
  type: 'workout' | 'rest' | 'light-activity';
  label: string;
  estimatedDuration: number;
  exercises?: WorkoutExercise[];
  lightActivity?: string;
};

export type WorkoutPlan = {
  weeklyWorkoutPlan: Record<string, WorkoutDay | string[]>;
  generatedAt: string;
  equipment: Equipment;
  fitnessLevel: FitnessLevel;
};

export type ProgressLog = {
  id: string;
  userId: string;
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  workoutCompleted?: boolean;
  workoutId?: string;
  notes?: string;
  createdAt: string;
};

export type BodyMeasurement = {
  id: string;
  userId: string;
  date: string;
  weight: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thigh?: number;
  bodyFatPercent?: number;
  notes?: string;
};

export type WorkoutCalendarEntry = {
  id: string;
  userId: string;
  date: string;
  dayOfWeek: string;
  status: 'planned' | 'completed' | 'skipped' | 'rescheduled';
  workoutSummary: string;
  exercisesCount: number;
  durationMinutes: number;
  completedAt?: string;
  notes?: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
};

export type GamificationStats = {
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  achievements: Achievement[];
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

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Сидячий образ жизни',
  light: 'Лёгкая активность (1–3 дня/неделя)',
  moderate: 'Умеренная активность (3–5 дней/неделя)',
  active: 'Высокая активность (6–7 дней/неделя)',
  'very-active': 'Очень высокая активность (2 раза/день)',
};

export const FITNESS_LABELS: Record<FitnessLevel, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  gym: 'Тренажёрный зал',
  home: 'Дома (гантели/резинки)',
  'no-equipment': 'Без оборудования',
};

export const DIET_LABELS: Record<DietRestriction, string> = {
  none: 'Без ограничений',
  vegan: 'Веган',
  vegetarian: 'Вегетарианец',
  halal: 'Халяль',
  kosher: 'Кошер',
  'gluten-free': 'Без глютена',
  'lactose-free': 'Без лактозы',
};
