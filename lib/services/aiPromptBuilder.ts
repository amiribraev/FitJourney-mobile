import type { Language } from '@/lib/i18n/types';
import type { DietRestriction, Equipment, FitnessLevel, Goal, UserProfile } from '@/lib/types';

export type UserContext = {
  gender: string;
  age: number;
  weight: number;
  height: number;
  goal: Goal;
  activityLevel: string;
  fitnessLevel: FitnessLevel;
  equipment: Equipment;
  dietRestriction: DietRestriction;
  allergies: string[];
  intolerances: string[];
  foodPreferences: string[];
  injuries: string[];
  loadRestrictions: string[];
  workoutGoals: string[];
  language: Language;
  variationSeed: number;
};

export function getSafeLanguage(language: unknown): Language {
  return language === 'kk' || language === 'en' || language === 'ru' ? language : 'ru';
}

export function getGeminiLanguageInstruction(language: Language): string {
  if (language === 'kk') {
    return `
Жауапты тек қазақ тілінде жаз.
Орыс немесе ағылшын тілін араластырма.
Қазақ әріптерін дұрыс қолдан: ә, ғ, қ, ң, ө, ұ, ү, і, һ.
Барлық тағам атаулары, жаттығу сипаттамалары, кеңестер мен түсіндірмелер қазақ тілінде болсын.
Егер JSON қайтарсаң, JSON кілттерін өзгертпе, тек мәтіндік мәндерді аудар.
`;
  }

  if (language === 'en') {
    return `
Respond only in English.
Do not mix Russian or Kazakh into the answer.
All meal names, workout descriptions, tips and explanations must be in English.
If you return JSON, do not translate JSON keys. Translate only text values.
`;
  }

  return `
Отвечай только на русском языке.
Не смешивай языки.
Все названия блюд, описания тренировок, советы и объяснения должны быть на русском.
Если возвращаешь JSON, не переводи ключи JSON. Переводи только текстовые значения.
`;
}

export function buildUserContext(profile: UserProfile): UserContext {
  return {
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
    language: getSafeLanguage(profile.language),
    variationSeed: Date.now() + Math.random() * 10000,
  };
}

export function buildWorkoutSystemPrompt(context: UserContext): string {
  return `
${getGeminiLanguageInstruction(context.language)}

Generate a weekly workout plan in strict JSON.
JSON keys must remain in English.

User:
- gender: ${context.gender}
- age: ${context.age}
- weight: ${context.weight}
- height: ${context.height}
- goal: ${context.goal}
- fitnessLevel: ${context.fitnessLevel}
- equipment: ${context.equipment}
- injuries: ${context.injuries.join(', ') || 'none'}
- loadRestrictions: ${context.loadRestrictions.join(', ') || 'none'}
- workoutGoals: ${context.workoutGoals.join(', ') || 'none'}

Rules:
- Do not include unsafe exercises for injuries/load restrictions.
- Keep JSON keys in English, translate only text values.
- Do not mix languages.

Return JSON only:
{
  "weeklyWorkoutPlan": {
    "Monday": {
      "type": "workout",
      "label": "...",
      "estimatedDuration": 45,
      "warmup": "...",
      "exercises": [{"name":"...", "sets":3, "reps":"10-12", "restSeconds":60}],
      "cooldown": "..."
    }
  }
}
variationSeed=${context.variationSeed}
`.trim();
}

export function buildDietSystemPrompt(context: UserContext): string {
  return `
${getGeminiLanguageInstruction(context.language)}

Generate a weekly meal plan in strict JSON.
JSON keys must remain in English.

User:
- goal: ${context.goal}
- dietRestriction: ${context.dietRestriction}
- allergies: ${context.allergies.join(', ') || 'none'}
- intolerances: ${context.intolerances.join(', ') || 'none'}
- foodPreferences: ${context.foodPreferences.join(', ') || 'none'}

Rules:
- Exclude all allergies/intolerances.
- Keep JSON keys in English, translate only text values.
- Do not mix languages.

Return JSON only:
{
  "weeklyDietPlan": {
    "Monday": [
      {"mealType":"Breakfast", "meal":"...", "calories":400, "protein":25, "budget":600}
    ]
  }
}
variationSeed=${context.variationSeed}
`.trim();
}
