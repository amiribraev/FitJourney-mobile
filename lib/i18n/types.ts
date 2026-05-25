export type Language = 'kk' | 'ru' | 'en';

export function isLanguage(value: unknown): value is Language {
  return value === 'kk' || value === 'ru' || value === 'en';
}

