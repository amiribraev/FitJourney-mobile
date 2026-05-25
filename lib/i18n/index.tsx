import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useMemo, useState, createContext, useContext } from 'react';
import { Platform } from 'react-native';
import en from './locales/en';
import kk from './locales/kk';
import ru from './locales/ru';
import { isLanguage, type Language } from './types';

const STORAGE_KEY = 'language';

const dictionaries = { ru, en, kk } as const;

type I18nContextValue = {
  language: Language;
  setLanguage: (next: Language) => Promise<void>;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function setStoredLanguage(language: Language) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, language);
}

async function getStoredLanguage(): Promise<Language | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return isLanguage(value) ? value : null;
    }
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function getByPath(source: unknown, key: string): unknown {
  return key.split('.').reduce((acc: any, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), source as any);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfileData, user } = useAuth();
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    let active = true;
    (async () => {
      const fromProfile = profile?.language;
      if (isLanguage(fromProfile)) {
        if (active) setLanguageState(fromProfile);
        await setStoredLanguage(fromProfile);
        return;
      }
      const fromStorage = await getStoredLanguage();
      if (active) setLanguageState(fromStorage ?? 'ru');
    })();
    return () => {
      active = false;
    };
  }, [profile?.language]);

  const setLanguage = useCallback(async (next: Language) => {
    setLanguageState(next);
    await setStoredLanguage(next);
    if (user) {
      await updateProfileData({ language: next });
    }
  }, [updateProfileData, user]);

  const t = useCallback((key: string): string => {
    const dict = dictionaries[language];
    const exact = getByPath(dict, key);
    if (typeof exact === 'string') return exact;

    const ruFallback = getByPath(dictionaries.ru, key);
    if (typeof ruFallback === 'string') {
      console.warn(`[i18n] Missing key "${key}" for language "${language}", fallback to ru`);
      return ruFallback;
    }

    console.warn(`[i18n] Missing key "${key}" in all dictionaries`);
    return key;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'kk', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

