import type { UserProfile, Meal, WorkoutDay, WorkoutPlan, DietPlan, Language } from '@/lib/types';
import type { UserContext } from './aiPromptBuilder';
import { DAY_ORDER } from '@/lib/types';

const FORBIDDEN_EXERCISES_BY_INJURY: Record<string, string[]> = {
  knee: ['squat', 'lunge', 'jump squat', 'jump', 'burpee'],
  back: ['deadlift', 'good morning', 'bent-over row', 'sit-up', 'leg raise', 'hyperextension'],
  shoulder: ['bench press', 'fly', 'overhead press', 'military press'],
  wrist: ['push-up', 'bench press', 'handstand'],
};

function getForbiddenExercises(injuries: string[]): string[] {
  const forbidden: string[] = [];
  const lowerInjuries = injuries.map((i) => i.toLowerCase());

  if (lowerInjuries.some((i) => i.includes('knee') || i.includes('колено') || i.includes('тізе'))) forbidden.push(...FORBIDDEN_EXERCISES_BY_INJURY.knee);
  if (lowerInjuries.some((i) => i.includes('back') || i.includes('спина') || i.includes('арқа'))) forbidden.push(...FORBIDDEN_EXERCISES_BY_INJURY.back);
  if (lowerInjuries.some((i) => i.includes('shoulder') || i.includes('плечо') || i.includes('иық'))) forbidden.push(...FORBIDDEN_EXERCISES_BY_INJURY.shoulder);
  if (lowerInjuries.some((i) => i.includes('wrist') || i.includes('запясть') || i.includes('білек'))) forbidden.push(...FORBIDDEN_EXERCISES_BY_INJURY.wrist);

  return [...new Set(forbidden)];
}

type LText = { ru: string; kk: string; en: string };

type ExerciseTemplate = {
  label: LText;
  sets: number;
  reps: number;
  restSeconds: number;
  equipment?: string;
};

type FoodTemplate = {
  label: LText;
  baseCalories: number;
  protein: number;
  budget: number;
};

const EXERCISE_DATABASE: Record<string, ExerciseTemplate[]> = {
  'no-equipment': [
    { label: { ru: 'Отжимания', kk: 'Қолды бүгіп-жазу', en: 'Push-ups' }, sets: 3, reps: 12, restSeconds: 60 },
    { label: { ru: 'Приседания с собственным весом', kk: 'Өз салмағымен отырып-тұру', en: 'Bodyweight squats' }, sets: 3, reps: 15, restSeconds: 45 },
    { label: { ru: 'Планка', kk: 'Планка', en: 'Plank' }, sets: 3, reps: 45, restSeconds: 30 },
    { label: { ru: 'Выпады вперед', kk: 'Алға шығу', en: 'Forward lunges' }, sets: 3, reps: 10, restSeconds: 45 },
    { label: { ru: 'Скручивания', kk: 'Пресске скручивания', en: 'Crunches' }, sets: 3, reps: 15, restSeconds: 30 },
    { label: { ru: 'Берпи', kk: 'Берпи', en: 'Burpees' }, sets: 3, reps: 8, restSeconds: 60 },
  ],
  home: [
    { label: { ru: 'Жим гантелей лежа', kk: 'Жатып гантельмен жим', en: 'Dumbbell bench press' }, sets: 4, reps: 10, restSeconds: 90, equipment: 'dumbbells' },
    { label: { ru: 'Приседания с гантелью', kk: 'Гантельмен отырып-тұру', en: 'Goblet squats' }, sets: 4, reps: 12, restSeconds: 90, equipment: 'dumbbells' },
    { label: { ru: 'Тяга гантели к поясу', kk: 'Гантельді белге тарту', en: 'One-arm dumbbell row' }, sets: 3, reps: 12, restSeconds: 60, equipment: 'dumbbells' },
    { label: { ru: 'Отжимания с колен', kk: 'Тізеден отжимания', en: 'Knee push-ups' }, sets: 3, reps: 15, restSeconds: 45 },
  ],
  gym: [
    { label: { ru: 'Жим штанги лежа', kk: 'Жатып штанга жимі', en: 'Bench press' }, sets: 4, reps: 8, restSeconds: 120, equipment: 'barbell' },
    { label: { ru: 'Становая тяга', kk: 'Өлі тарту', en: 'Deadlift' }, sets: 4, reps: 6, restSeconds: 120, equipment: 'barbell' },
    { label: { ru: 'Подтягивания', kk: 'Тартылу', en: 'Pull-ups' }, sets: 3, reps: 10, restSeconds: 90, equipment: 'pull-up bar' },
    { label: { ru: 'Жим над головой', kk: 'Бастан жоғары жим', en: 'Overhead press' }, sets: 3, reps: 10, restSeconds: 90, equipment: 'barbell' },
  ],
};

const FOOD_DATABASE: Record<string, FoodTemplate[]> = {
  'weight loss': [
    { label: { ru: 'Овсянка с ягодами', kk: 'Жидек қосылған сұлы ботқасы', en: 'Oatmeal with berries' }, baseCalories: 350, protein: 15, budget: 600 },
    { label: { ru: 'Греческий йогурт с орехами', kk: 'Жаңғақ қосылған грек йогурты', en: 'Greek yogurt with nuts' }, baseCalories: 250, protein: 20, budget: 500 },
    { label: { ru: 'Курица на гриле с салатом', kk: 'Салатпен гриль тауық еті', en: 'Grilled chicken salad' }, baseCalories: 400, protein: 40, budget: 900 },
    { label: { ru: 'Запеченная рыба с овощами', kk: 'Көкөніспен пісірілген балық', en: 'Baked fish with vegetables' }, baseCalories: 350, protein: 35, budget: 850 },
  ],
  'muscle gain': [
    { label: { ru: 'Протеиновая овсянка с бананом', kk: 'Банан қосылған протеинді сұлы ботқасы', en: 'Protein oatmeal with banana' }, baseCalories: 600, protein: 40, budget: 700 },
    { label: { ru: 'Гречка с курицей', kk: 'Тауық етімен қарақұмық', en: 'Buckwheat with chicken' }, baseCalories: 650, protein: 45, budget: 900 },
    { label: { ru: 'Лосось с рисом', kk: 'Күрішпен лосось', en: 'Salmon with rice' }, baseCalories: 700, protein: 50, budget: 1100 },
    { label: { ru: 'Индейка с бататом', kk: 'Бататпен күркетауық еті', en: 'Turkey with sweet potato' }, baseCalories: 680, protein: 52, budget: 1300 },
  ],
  maintenance: [
    { label: { ru: 'Овсянка с фруктами', kk: 'Жеміспен сұлы ботқасы', en: 'Oatmeal with fruit' }, baseCalories: 450, protein: 20, budget: 500 },
    { label: { ru: 'Курица с киноа и овощами', kk: 'Киноа мен көкөніс қосылған тауық еті', en: 'Chicken with quinoa and vegetables' }, baseCalories: 550, protein: 40, budget: 900 },
    { label: { ru: 'Запеченные овощи с рыбой', kk: 'Балықпен пісірілген көкөністер', en: 'Baked vegetables with fish' }, baseCalories: 480, protein: 35, budget: 950 },
    { label: { ru: 'Салат с мясом', kk: 'Ет қосылған салат', en: 'Meat salad' }, baseCalories: 500, protein: 38, budget: 800 },
  ],
};

const EXCLUDED_FOOD_WORDS: Record<string, string[]> = {
  nuts: ['nuts', 'almond', 'hazelnut', 'walnut', 'cashew', 'орех', 'жаңғақ'],
  milk: ['milk', 'cheese', 'yogurt', 'молоко', 'сүт', 'йогурт'],
  eggs: ['egg', 'omelet', 'яйц', 'жұмыртқа'],
  gluten: ['bread', 'pasta', 'wheat', 'хлеб', 'глютен', 'нан'],
  soy: ['soy', 'tofu', 'соя'],
};

function getPlanLabels(language: Language) {
  if (language === 'kk') {
    return {
      strength: 'Күш жаттығулары',
      cardio: 'Кардио',
      endurance: 'Төзімділік',
      flexibility: 'Икемділік',
      activeRecovery: 'Белсенді қалпына келу',
      rest: 'Демалыс',
      warmup: '5 минут жеңіл қыздыру',
      cooldown: '5 минут баяу аяқтау',
      breakfast: 'Таңғы ас',
      lunch: 'Түскі ас',
      dinner: 'Кешкі ас',
      snack: 'Тіскебасар',
    };
  }

  if (language === 'ru') {
    return {
      strength: 'Силовые',
      cardio: 'Кардио',
      endurance: 'Выносливость',
      flexibility: 'Гибкость',
      activeRecovery: 'Активное восстановление',
      rest: 'Отдых',
      warmup: '5 мин легкой разминки',
      cooldown: '5 мин заминки',
      breakfast: 'Завтрак',
      lunch: 'Обед',
      dinner: 'Ужин',
      snack: 'Перекус',
    };
  }

  return {
    strength: 'Strength',
    cardio: 'Cardio',
    endurance: 'Endurance',
    flexibility: 'Flexibility',
    activeRecovery: 'Active recovery',
    rest: 'Rest',
    warmup: '5 min light warmup',
    cooldown: '5 min cooldown',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
}

function pickText(label: LText, language: Language) {
  return label[language] ?? label.ru;
}

export function generateLocalWorkoutPlan(context: UserContext): WorkoutPlan {
  const language = context.language;
  const toExercise = (item: ExerciseTemplate) => ({
    name: pickText(item.label, language),
    sets: item.sets,
    reps: item.reps,
    restSeconds: item.restSeconds,
    ...(item.equipment ? { equipment: item.equipment } : {}),
  });

  let exercises = (EXERCISE_DATABASE[context.equipment] || EXERCISE_DATABASE['no-equipment']).map(toExercise);

  const forbiddenExercises = getForbiddenExercises(context.injuries);
  if (forbiddenExercises.length > 0) {
    exercises = exercises.filter((exercise) => !forbiddenExercises.some((forbidden) => exercise.name.toLowerCase().includes(forbidden.toLowerCase())));
  }

  if (exercises.length === 0) {
    exercises = EXERCISE_DATABASE['no-equipment'].map(toExercise);
  }

  const labels = getPlanLabels(language);
  const variationSeed = Math.floor(context.variationSeed);
  const dayTypes = [labels.strength, labels.cardio, labels.endurance, labels.flexibility, labels.strength, labels.cardio, labels.activeRecovery];
  const weeklyPlan: Record<string, WorkoutDay> = {};

  DAY_ORDER.forEach((day, index) => {
    const dayType = dayTypes[index % dayTypes.length];
    const isRest = dayType === labels.activeRecovery;

    if (isRest) {
      weeklyPlan[day] = { type: 'rest', label: labels.rest, estimatedDuration: 30, exercises: [] };
      return;
    }

    const shuffled = [...exercises].sort(() => ((variationSeed + index * 31) % 100) / 100 - 0.5);
    weeklyPlan[day] = {
      type: 'workout',
      label: dayType,
      estimatedDuration: 45,
      warmup: labels.warmup,
      exercises: shuffled.slice(0, 4 + (index % 3)),
      cooldown: labels.cooldown,
    };
  });

  return {
    weeklyWorkoutPlan: weeklyPlan,
    generatedLanguage: language,
    generatedAt: new Date().toISOString(),
    equipment: context.equipment,
    fitnessLevel: context.fitnessLevel,
  };
}

export function generateLocalDietPlan(context: UserContext): DietPlan {
  const language = context.language;
  const foods = FOOD_DATABASE[context.goal] || FOOD_DATABASE.maintenance;
  const labels = getPlanLabels(language);

  const bannedFoods = [...context.allergies, ...context.intolerances].map((x) => x.toLowerCase());
  const excludedWords = new Set<string>();
  bannedFoods.forEach((item) => {
    const words = EXCLUDED_FOOD_WORDS[item] || [item];
    words.forEach((w) => excludedWords.add(w));
  });

  const filteredFoods = foods.filter((f) => {
    const text = `${f.label.ru} ${f.label.kk} ${f.label.en}`.toLowerCase();
    return !Array.from(excludedWords).some((word) => text.includes(word));
  });
  const safeFoods = filteredFoods.length > 0 ? filteredFoods : foods;

  const weeklyPlan: Record<string, Meal[]> = {};
  const variationSeed = Math.floor(context.variationSeed);

  if (safeFoods.length === 0) {
    DAY_ORDER.forEach((day) => {
      weeklyPlan[day] = [];
    });
  } else {
    DAY_ORDER.forEach((day, dayIndex) => {
      const offset = (variationSeed + dayIndex * 13) % safeFoods.length;
      const breakfastFood = safeFoods[offset % safeFoods.length];
      const lunchFood = safeFoods[(offset + 1) % safeFoods.length];
      const dinnerFood = safeFoods[(offset + 2) % safeFoods.length];
      const snackFood = safeFoods[(offset + 3) % safeFoods.length];

      weeklyPlan[day] = [
        { mealType: labels.breakfast, meal: pickText(breakfastFood.label, language), calories: breakfastFood.baseCalories, protein: breakfastFood.protein, budget: breakfastFood.budget },
        { mealType: labels.lunch, meal: pickText(lunchFood.label, language), calories: lunchFood.baseCalories, protein: lunchFood.protein, budget: lunchFood.budget },
        { mealType: labels.dinner, meal: pickText(dinnerFood.label, language), calories: dinnerFood.baseCalories, protein: dinnerFood.protein, budget: dinnerFood.budget },
        { mealType: labels.snack, meal: pickText(snackFood.label, language), calories: Math.round(snackFood.baseCalories * 0.6), protein: Math.round(snackFood.protein * 0.6), budget: Math.round(snackFood.budget * 0.6) },
      ];
    });
  }

  const baseCalories = context.goal === 'weight loss' ? 1800 : context.goal === 'muscle gain' ? 2500 : 2200;
  const protein = Math.round(context.weight * (context.goal === 'muscle gain' ? 2.2 : 2.0));

  return {
    weeklyDietPlan: weeklyPlan,
    generatedLanguage: language,
    generatedAt: new Date().toISOString(),
    tdeeUsed: baseCalories,
    macrosUsed: {
      protein,
      fat: Math.round((baseCalories * 0.25) / 9),
      carbs: Math.round((baseCalories - protein * 4 - baseCalories * 0.25) / 4),
    },
  };
}

export function generateLocalPlans(profile: UserProfile): { workoutPlan: WorkoutPlan; dietPlan: DietPlan } {
  const context = {
    gender: profile.gender,
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    fitnessLevel: profile.fitnessLevel,
    equipment: profile.equipment,
    dietRestriction: profile.dietRestriction,
    allergies: profile.allergies ?? [],
    intolerances: profile.intolerances ?? [],
    foodPreferences: profile.foodPreferences ?? [],
    injuries: profile.injuries ?? [],
    loadRestrictions: profile.loadRestrictions ?? [],
    workoutGoals: profile.workoutGoals ?? [],
    language: profile.language,
    variationSeed: Date.now() + Math.random() * 10000,
  } as const;

  return {
    workoutPlan: generateLocalWorkoutPlan(context),
    dietPlan: generateLocalDietPlan(context),
  };
}
