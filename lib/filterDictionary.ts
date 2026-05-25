import type { Language } from '@/lib/i18n/types';

export type FilterCategory =
  | 'allergies'
  | 'intolerances'
  | 'foodPreferences'
  | 'injuries'
  | 'loadRestrictions'
  | 'workoutGoals';

export type FilterOption = {
  key: string;
  label: Record<Language, string>;
};

type Dictionary = Record<FilterCategory, FilterOption[]>;

export const FILTER_OPTIONS: Dictionary = {
  allergies: [
    { key: 'nuts', label: { ru: 'Орехи', kk: 'Жаңғақтар', en: 'Nuts' } },
    { key: 'oatmeal', label: { ru: 'Овсянка', kk: 'Сұлы жармасы', en: 'Oatmeal' } },
    { key: 'milk', label: { ru: 'Молоко', kk: 'Сүт', en: 'Milk' } },
    { key: 'chicken', label: { ru: 'Курица', kk: 'Тауық еті', en: 'Chicken' } },
    { key: 'gluten', label: { ru: 'Глютен', kk: 'Глютен', en: 'Gluten' } },
    { key: 'lactose', label: { ru: 'Лактоза', kk: 'Лактоза', en: 'Lactose' } },
  ],
  intolerances: [
    { key: 'lactose', label: { ru: 'Лактоза', kk: 'Лактоза', en: 'Lactose' } },
    { key: 'gluten', label: { ru: 'Глютен', kk: 'Глютен', en: 'Gluten' } },
    { key: 'sugar', label: { ru: 'Сахар', kk: 'Қант', en: 'Sugar' } },
  ],
  foodPreferences: [
    { key: 'chicken', label: { ru: 'Курица', kk: 'Тауық еті', en: 'Chicken' } },
    { key: 'oatmeal', label: { ru: 'Овсянка', kk: 'Сұлы жармасы', en: 'Oatmeal' } },
    { key: 'nuts', label: { ru: 'Орехи', kk: 'Жаңғақтар', en: 'Nuts' } },
  ],
  injuries: [
    { key: 'knee', label: { ru: 'Колено', kk: 'Тізе', en: 'Knee' } },
    { key: 'back', label: { ru: 'Спина', kk: 'Арқа', en: 'Back' } },
    { key: 'shoulder', label: { ru: 'Плечо', kk: 'Иық', en: 'Shoulder' } },
    { key: 'wrist', label: { ru: 'Запястье', kk: 'Білек', en: 'Wrist' } },
  ],
  loadRestrictions: [
    { key: 'no_running', label: { ru: 'Нельзя бегать', kk: 'Жүгіруге болмайды', en: 'No running' } },
    { key: 'no_jumping', label: { ru: 'Нельзя прыгать', kk: 'Секіруге болмайды', en: 'No jumping' } },
    { key: 'light_only', label: { ru: 'Только лёгкие тренировки', kk: 'Тек жеңіл жаттығулар', en: 'Light workouts only' } },
  ],
  workoutGoals: [
    { key: 'weight_loss', label: { ru: 'Похудение', kk: 'Арықтау', en: 'Weight loss' } },
    { key: 'muscle_gain', label: { ru: 'Набор мышечной массы', kk: 'Бұлшықет массасын арттыру', en: 'Muscle gain' } },
    { key: 'health', label: { ru: 'Улучшение здоровья', kk: 'Денсаулықты жақсарту', en: 'Health improvement' } },
  ],
};

export function normalizeFilterInput(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getFilterLabel(category: FilterCategory, keyOrLegacyValue: string, language: Language): string {
  const normalized = normalizeFilterInput(keyOrLegacyValue);
  const option = FILTER_OPTIONS[category].find((item) => {
    if (item.key === normalized) return true;
    return (Object.values(item.label) as string[]).some((label) => normalizeFilterInput(label) === normalized);
  });
  return option ? option.label[language] : keyOrLegacyValue;
}

export function findFilterKey(category: FilterCategory, keyOrLegacyValue: string): string | null {
  const normalized = normalizeFilterInput(keyOrLegacyValue);
  const option = FILTER_OPTIONS[category].find((item) => {
    if (item.key === normalized) return true;
    return (Object.values(item.label) as string[]).some((label) => normalizeFilterInput(label) === normalized);
  });
  return option?.key ?? null;
}

export function searchFilterOptions(category: FilterCategory, query: string): FilterOption[] {
  const normalized = normalizeFilterInput(query);
  if (!normalized) return FILTER_OPTIONS[category];
  return FILTER_OPTIONS[category].filter((option) => {
    if (option.key.includes(normalized)) return true;
    return (Object.values(option.label) as string[]).some((label) => normalizeFilterInput(label).includes(normalized));
  });
}

