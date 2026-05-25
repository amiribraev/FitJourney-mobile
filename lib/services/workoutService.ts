import type { UserProfile, WorkoutDay, WorkoutExercise } from '@/lib/types';
import type { UserContext } from './aiPromptBuilder';

const KNEE_RISK = ['jump', 'squat', 'lunge', 'burpee', 'running', 'plyometric', 'присед', 'выпад', 'плие', 'берпи', 'подпрыг', 'лыж'];
const BACK_RISK = ['deadlift', 'good morning', 'hyperextension', 'barbell row', 'sit-up', 'становая', 'тяга в наклоне', 'сит-ап', 'подъем ног', 'гиперэкстензия'];
const SHOULDER_RISK = ['жим лежа', 'разводка', 'выджимы за голову', 'армейский жим', 'shoulder press', 'overhead press'];
const WRIST_RISK = ['отжимание', 'push-up', 'жим лежа', 'стойка на руках'];

const ALTERNATIVES: Record<string, string> = {
  knee: 'Упражнения для колена: прямые выпады без глубокого приседания, машинка для квадрицепсов, педали эллипса / статические упражнения для куксов',
  back: 'Bird-dog, glute bridge, dead bug и другие упражнения для поддержки поясницы',
  shoulder: 'Ароматерапия, разводки во вращении рук, упражнения с резинкой для плечевого пояса',
  wrist: 'Упражнения с резинкой для запястий, планка на предплечьях',
};

function includesAny(text: string, terms: string[]) {
  const low = text.toLowerCase();
  return terms.some((t) => low.includes(t));
}

function getLoadRestrictionTerms(loadRestrictions: string[]): string[] {
  const terms: string[] = [];
  const lower = loadRestrictions.map((item) => item.toLowerCase());

  if (lower.some((i) => i.includes('нельзя бегать') || i.includes('без кардио'))) terms.push('бег', 'running', 'кардио');
  if (lower.some((i) => i.includes('нельзя прыгать'))) terms.push('прыж', 'jump', 'burpee');
  if (lower.some((i) => i.includes('нельзя приседать'))) terms.push('присед', 'squat');
  if (lower.some((i) => i.includes('нельзя становую'))) terms.push('становая', 'deadlift');
  if (lower.some((i) => i.includes('нельзя жим над головой'))) terms.push('жим над головой', 'overhead press', 'shoulder press');
  if (lower.some((i) => i.includes('без тяжёлых весов') || i.includes('только лёгкие тренировки') || i.includes('низкая нагрузка'))) {
    terms.push('heavy', 'max', '1rm');
  }

  return [...new Set(terms)];
}

function getInjuredAreas(injuries: string[]): { knee: boolean; back: boolean; shoulder: boolean; wrist: boolean } {
  const lowers = injuries.map((i) => i.toLowerCase());
  return {
    knee: lowers.some((i) => i.includes('колено') || i.includes('knee')),
    back: lowers.some((i) => i.includes('спина') || i.includes('back')),
    shoulder: lowers.some((i) => i.includes('плечо') || i.includes('shoulder')),
    wrist: lowers.some((i) => i.includes('запястье') || i.includes('wrist')),
  };
}

export function filterWorkoutDay(day: WorkoutDay | string[], profile: UserProfile | null): WorkoutDay | string[] {
  if (!profile) return day;
  const injured = getInjuredAreas(profile.injuries);

  if (Array.isArray(day)) {
    const filtered = day.filter((item) => {
      if (injured.knee && includesAny(item, KNEE_RISK)) return false;
      if (injured.back && includesAny(item, BACK_RISK)) return false;
      if (injured.shoulder && includesAny(item, SHOULDER_RISK)) return false;
      if (injured.wrist && includesAny(item, WRIST_RISK)) return false;
      return true;
    });

    if (!filtered.length && (injured.knee || injured.back || injured.shoulder || injured.wrist)) {
      const areas = [];
      if (injured.knee) areas.push(ALTERNATIVES.knee);
      if (injured.back) areas.push(ALTERNATIVES.back);
      if (injured.shoulder) areas.push(ALTERNATIVES.shoulder);
      if (injured.wrist) areas.push(ALTERNATIVES.wrist);
      return areas;
    }

    if (filtered.length !== day.length) {
      if (injured.knee) filtered.push(`Альтернативы для колена: ${ALTERNATIVES.knee}`);
      if (injured.back) filtered.push(`Альтернативы для спины: ${ALTERNATIVES.back}`);
      if (injured.shoulder) filtered.push(`Альтернативы для плеча: ${ALTERNATIVES.shoulder}`);
      if (injured.wrist) filtered.push(`Альтернативы для запястья: ${ALTERNATIVES.wrist}`);
    }
    return filtered;
  }

  if (!day.exercises?.length) return day;

  const exercises = day.exercises.filter((ex) => {
    if (injured.knee && includesAny(ex.name, KNEE_RISK)) return false;
    if (injured.back && includesAny(ex.name, BACK_RISK)) return false;
    if (injured.shoulder && includesAny(ex.name, SHOULDER_RISK)) return false;
    if (injured.wrist && includesAny(ex.name, WRIST_RISK)) return false;
    return true;
  });

  if (!exercises.length && (injured.knee || injured.back || injured.shoulder || injured.wrist)) {
    return {
      ...day,
      type: 'light-activity',
      lightActivity: injured.knee ? ALTERNATIVES.knee : injured.back ? ALTERNATIVES.back : injured.shoulder ? ALTERNATIVES.shoulder : ALTERNATIVES.wrist,
      exercises: [],
    };
  }

  return { ...day, exercises };
}

export function filterWorkoutWithFullContext(day: WorkoutDay | string[], context: UserContext): WorkoutDay | string[] {
  const injured = getInjuredAreas(context.injuries);
  const restrictionTerms = getLoadRestrictionTerms(context.loadRestrictions);

  if (Array.isArray(day)) {
    const filtered = day.filter((item) => {
      if (injured.knee && includesAny(item, KNEE_RISK)) return false;
      if (injured.back && includesAny(item, BACK_RISK)) return false;
      if (injured.shoulder && includesAny(item, SHOULDER_RISK)) return false;
      if (injured.wrist && includesAny(item, WRIST_RISK)) return false;
      if (restrictionTerms.length && includesAny(item, restrictionTerms)) return false;
      return true;
    });

    if (filtered.length !== day.length) {
      if (injured.knee) filtered.push(`Альтернативы для колена: ${ALTERNATIVES.knee}`);
      if (injured.back) filtered.push(`Альтернативы для спины: ${ALTERNATIVES.back}`);
      if (injured.shoulder) filtered.push(`Альтернативы для плеча: ${ALTERNATIVES.shoulder}`);
      if (injured.wrist) filtered.push(`Альтернативы для запястья: ${ALTERNATIVES.wrist}`);
    }
    return filtered;
  }

  if (!day.exercises?.length) return day;

  const exercises = day.exercises.filter((ex) => {
    if (injured.knee && includesAny(ex.name, KNEE_RISK)) return false;
    if (injured.back && includesAny(ex.name, BACK_RISK)) return false;
    if (injured.shoulder && includesAny(ex.name, SHOULDER_RISK)) return false;
    if (injured.wrist && includesAny(ex.name, WRIST_RISK)) return false;
    if (restrictionTerms.length && includesAny(ex.name, restrictionTerms)) return false;
    return true;
  });

  return { ...day, exercises };
}

export function getForbiddenExercisesList(injuries: string[]): string[] {
  const injured = getInjuredAreas(injuries);
  const forbidden: string[] = [];
  
  if (injured.knee) forbidden.push(...KNEE_RISK);
  if (injured.back) forbidden.push(...BACK_RISK);
  if (injured.shoulder) forbidden.push(...SHOULDER_RISK);
  if (injured.wrist) forbidden.push(...WRIST_RISK);
  
  return [...new Set(forbidden)];
}
