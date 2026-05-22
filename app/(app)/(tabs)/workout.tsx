import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DAY_ORDER, DAY_LABELS } from '@/lib/types';
import { colors } from '@/constants/theme';

export default function WorkoutScreen() {
  const { profile } = useAuth();
  const [openDay, setOpenDay] = useState<string>(DAY_ORDER[0]);
  const weeklyPlan = profile?.workoutPlan?.weeklyWorkoutPlan;

  if (!weeklyPlan) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>План тренировок ещё не готов</Text>
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
        const exercises = weeklyPlan[day] as string[] | undefined;
        if (!exercises?.length) return null;
        const isOpen = openDay === day;
        const isRest = exercises.length === 1 && exercises[0].toLowerCase().includes('отдых');

        return (
          <View key={day} style={styles.dayCard}>
            <TouchableOpacity onPress={() => setOpenDay(isOpen ? '' : day)}>
              <Text style={styles.dayTitle}>
                {DAY_LABELS[day]}
                {isRest ? ' · отдых' : ` · ${exercises.length} упр.`}
              </Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.list}>
                {exercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <Text style={styles.bullet}>{i + 1}.</Text>
                    <Text style={styles.exerciseText}>{ex}</Text>
                  </View>
                ))}
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: { fontSize: 17, fontWeight: '600', padding: 16, color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  exerciseRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  bullet: { fontSize: 15, fontWeight: '700', color: colors.primary, width: 24 },
  exerciseText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
