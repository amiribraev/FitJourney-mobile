import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DAY_ORDER } from '@/lib/types';
import { colors } from '@/constants/theme';
import type { Meal } from '@/lib/types';
import { filterMealsForProfile, calculateDailyTargets } from '@/lib/services/mealService';
import { useI18n } from '@/lib/i18n';

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function localizeMealType(value: string, t: (key: string) => string) {
  const normalized = normalizeText(value);
  if (['breakfast', 'завтрак', 'таңғы ас'].includes(normalized)) return t('progress.breakfast');
  if (['lunch', 'обед', 'түскі ас'].includes(normalized)) return t('progress.lunch');
  if (['dinner', 'ужин', 'кешкі ас'].includes(normalized)) return t('progress.dinner');
  if (['snack', 'перекус', 'тіскебасар'].includes(normalized)) return t('common.notSpecified');
  return value;
}

export default function DietScreen() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [openDay, setOpenDay] = useState<string>(DAY_ORDER[0]);
  const weeklyPlan = profile?.dietPlan?.weeklyDietPlan;

  if (!weeklyPlan) {
    return <View style={styles.center}><Text style={styles.emptyTitle}>{t('dietScreen.emptyTitle')}</Text><Text style={styles.emptyText}>{t('dietScreen.emptyText')}</Text></View>;
  }

  const targets = profile ? calculateDailyTargets(profile) : { calories: 2000, protein: 100 };
  const goalLabel = profile?.goal === 'weight loss' ? t('goals.weightLoss') : profile?.goal === 'muscle gain' ? t('goals.muscleGain') : t('goals.maintenance');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        {t('dietScreen.goal')}: {goalLabel}
        {'\n'}
        {t('dietScreen.dailyTarget')}: ~{targets.calories} kcal · {t('dietScreen.protein')} ~{targets.protein} g
      </Text>
      {DAY_ORDER.map((day) => {
        const rawMeals = weeklyPlan[day] as Meal[] | undefined;
        const meals = rawMeals ? filterMealsForProfile(rawMeals, profile) : undefined;
        const safeMeals = (meals ?? []).filter((meal): meal is Meal => !!meal && typeof meal.meal === 'string');
        const filterSummary = rawMeals ? { hasChanges: rawMeals.length !== meals?.length, removed: (rawMeals?.length ?? 0) - (meals?.length ?? 0) } : { hasChanges: false, removed: 0 };
        if (!safeMeals.length) return null;
        const isOpen = openDay === day;
        const dayCalories = safeMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
        const dayBudget = safeMeals.reduce((s, m) => s + (m.budget ?? 0), 0);
        const dayProtein = safeMeals.reduce((s, m) => s + (m.protein ?? 0), 0);
        return (
          <View key={day} style={styles.dayCard}>
            <TouchableOpacity onPress={() => setOpenDay(isOpen ? '' : day)}><Text style={styles.dayTitle}>{t(`days.${day}`)}</Text></TouchableOpacity>
            {isOpen && (
              <View style={styles.meals}>
                {safeMeals.map((meal, i) => (
                  <View key={i} style={styles.mealRow}>
                    {meal.mealType && <Text style={styles.mealType}>{localizeMealType(meal.mealType, t)}</Text>}
                    <Text style={styles.mealName}>{meal.meal}</Text>
                    <Text style={styles.mealMeta}>{meal.calories} kcal{meal.protein != null ? ` · ${t('dietScreen.protein')} ~${meal.protein} g` : ''}{meal.budget != null ? ` · ~${meal.budget} ₸` : ''}</Text>
                  </View>
                ))}
                {filterSummary.hasChanges && <Text style={styles.filterHint}>{t('dietScreen.excludedByFilters')}: {filterSummary.removed}</Text>}
                <Text style={styles.dayTotal}>{t('dietScreen.total')}: {dayCalories} kcal{dayProtein > 0 ? ` · ${t('dietScreen.protein')} ~${dayProtein} g` : ''}{dayBudget > 0 ? ` · ~${dayBudget} ₸` : ''}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  header: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  dayCard: { backgroundColor: colors.card, borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  dayTitle: { fontSize: 17, fontWeight: '600', padding: 16, color: colors.text },
  meals: { paddingHorizontal: 16, paddingBottom: 16 },
  mealRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  mealType: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '500', color: colors.text },
  mealMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  filterHint: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  dayTotal: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
