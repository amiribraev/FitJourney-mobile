import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DAY_ORDER, DAY_LABELS } from '@/lib/types';
import { colors } from '@/constants/theme';
import type { Meal } from '@/lib/types';

export default function DietScreen() {
  const { profile } = useAuth();
  const [openDay, setOpenDay] = useState<string>(DAY_ORDER[0]);
  const weeklyPlan = profile?.dietPlan?.weeklyDietPlan;

  if (!weeklyPlan) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>План питания ещё не готов</Text>
        <Text style={styles.emptyText}>Откройте вкладку «Профиль» — планы сгенерируются автоматически.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        Цель: {profile?.goal === 'weight loss' ? 'похудение' : 'набор массы'}
      </Text>

      {DAY_ORDER.map((day) => {
        const meals = weeklyPlan[day] as Meal[] | undefined;
        if (!meals?.length) return null;
        const isOpen = openDay === day;
        const dayCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
        const dayBudget = meals.reduce((s, m) => s + (m.budget ?? 0), 0);
        const dayProtein = meals.reduce((s, m) => s + (m.protein ?? 0), 0);

        return (
          <View key={day} style={styles.dayCard}>
            <TouchableOpacity onPress={() => setOpenDay(isOpen ? '' : day)}>
              <Text style={styles.dayTitle}>{DAY_LABELS[day]}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.meals}>
                {meals.map((meal, i) => (
                  <View key={i} style={styles.mealRow}>
                    {meal.mealType && <Text style={styles.mealType}>{meal.mealType}</Text>}
                    <Text style={styles.mealName}>{meal.meal}</Text>
                    <Text style={styles.mealMeta}>
                      {meal.calories} ккал
                      {meal.protein != null ? ` · белок ~${meal.protein} г` : ''}
                      {meal.budget != null ? ` · ~${meal.budget} ₽` : ''}
                    </Text>
                  </View>
                ))}
                <Text style={styles.dayTotal}>
                  Итого: {dayCalories} ккал
                  {dayProtein > 0 ? ` · белок ~${dayProtein} г` : ''}
                  {dayBudget > 0 ? ` · ~${dayBudget} ₽` : ''}
                </Text>
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
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: { fontSize: 17, fontWeight: '600', padding: 16, color: colors.text },
  meals: { paddingHorizontal: 16, paddingBottom: 16 },
  mealRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealType: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '500', color: colors.text },
  mealMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  dayTotal: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
