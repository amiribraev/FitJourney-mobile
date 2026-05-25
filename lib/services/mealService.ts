import type { Meal, UserProfile } from '@/lib/types';
import type { UserContext } from './aiPromptBuilder';

function normalize(values: string[]) {
  return values.map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function expandBannedTerms(values: string[]) {
  const normalized = normalize(values);
  const expanded: string[] = [];
  for (const item of normalized) {
    expanded.push(item);
    const mapped = BANNED_FOOD_KEYWORDS[item];
    if (mapped?.length) expanded.push(...mapped.map((term) => term.toLowerCase()));
  }
  return [...new Set(expanded)];
}

function containsAny(text: string, needles: string[]) {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

function isValidMeal(value: unknown): value is Meal {
  if (!value || typeof value !== 'object') return false;
  const meal = value as Partial<Meal>;
  return typeof meal.meal === 'string' && meal.meal.trim().length > 0;
}

function sanitizeMeals(meals: Meal[]): Meal[] {
  return (Array.isArray(meals) ? meals : []).filter(isValidMeal);
}

const BANNED_FOOD_KEYWORDS: Record<string, string[]> = {
  'орехи': ['орех', 'орехи', 'грецкие орехи', 'миндаль', 'фундук', 'кешью', 'пекан', 'кокос'],
  'молоко': ['молоко', 'сыр', 'йогурт', 'творог', 'ряженка', 'кефир', 'сметана'],
  'яйца': ['яйцо', 'омлет', 'яичница'],
  'рис': ['рис', 'рисовый'],
  'глютен': ['хлеб', 'паста', 'макароны', 'булка', 'лаваш'],
  'лактоза': ['молоко', 'сыр', 'йогурт', 'творог', 'сметана', 'масло'],
  'соевые': ['соевый', 'тофу', 'соевые бобы'],
  'рыба': ['рыба', 'лосось', 'тунец', 'скумбрия', 'форель'],
};

const PREFERRED_KEYWORDS: Record<string, string[]> = {
  'курица': ['курица', 'индейка', 'цыпленок'],
  'говядина': ['говядина', 'говяжье', 'стейк'],
  'свинина': ['свинина', 'свинье'],
  'рыба': ['рыба', 'лосось', 'тунец', 'скумбрия'],
  'тофу': ['тофу'],
  'гречка': ['гречка', 'гречневая'],
  'овсянка': ['овсянка', 'овсяные'],
  'лосось': ['лосось', 'семга'],
};

export function filterMealsForProfile(meals: Meal[], profile: UserProfile | null): Meal[] {
  const safeMeals = sanitizeMeals(meals);
  if (!profile) return safeMeals;
  
  const banned = expandBannedTerms([...profile.allergies, ...profile.intolerances]);
  const preferences = normalize(profile.foodPreferences);
  
  if (!banned.length && !preferences.length) return safeMeals;

  return safeMeals
    .filter((meal) => !containsAny(meal.meal, banned))
    .sort((a, b) => {
      const aPrefText = (a.meal || '').toLowerCase();
      const bPrefText = (b.meal || '').toLowerCase();
      let aScore = 0, bScore = 0;
      
      for (const pref of preferences) {
        const prefKeywords = PREFERRED_KEYWORDS[pref] || [pref];
        if (prefKeywords.some(k => aPrefText.includes(k))) aScore += 1;
        if (prefKeywords.some(k => bPrefText.includes(k))) bScore += 1;
      }
      
      return bScore - aScore;
    });
}

export function filterMealsWithFullContext(meals: Meal[], context: UserContext): Meal[] {
  const safeMeals = sanitizeMeals(meals);
  const banned = expandBannedTerms([...context.allergies, ...context.intolerances]);
  const preferences = normalize(context.foodPreferences);
  
  if (!banned.length && !preferences.length) return safeMeals;

  return safeMeals
    .filter((meal) => !containsAny(meal.meal, banned))
    .sort((a, b) => {
      const aPrefText = (a.meal || '').toLowerCase();
      const bPrefText = (b.meal || '').toLowerCase();
      let aScore = 0, bScore = 0;
      
      for (const pref of preferences) {
        const prefKeywords = PREFERRED_KEYWORDS[pref] || [pref];
        if (prefKeywords.some(k => aPrefText.includes(k))) aScore += 1;
        if (prefKeywords.some(k => bPrefText.includes(k))) bScore += 1;
      }
      
      return bScore - aScore;
    });
}

export function summarizeMealFiltering(meals: Meal[], filtered: Meal[]) {
  const removed = meals.length - filtered.length;
  return {
    removed,
    hasChanges: removed > 0,
  };
}

export function calculateDailyTargets(profile: UserProfile): { calories: number; protein: number } {
  const baseCalories = profile.tdee || 2000;
  
  let calories = baseCalories;
  if (profile.goal === 'weight loss') calories = baseCalories - 500;
  else if (profile.goal === 'muscle gain') calories = baseCalories + 400;
  
  const protein = Math.round(profile.weight * (profile.goal === 'muscle gain' ? 2.2 : 2.0));
  
  return { calories, protein };
}
