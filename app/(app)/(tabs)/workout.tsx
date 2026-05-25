import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { DAY_ORDER, type WorkoutDay, type WorkoutExercise } from '@/lib/types';
import { colors } from '@/constants/theme';
import { filterWorkoutDay } from '@/lib/services/workoutService';
import { useI18n } from '@/lib/i18n';

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function looksLikeRestLine(value: string) {
  const v = normalizeText(value);
  return v.includes('rest') || v.includes('отдых') || v.includes('демалыс') || v.includes('active recovery') || v.includes('восстанов');
}

function formatExercise(ex: WorkoutExercise) {
  const sets = ex.sets ?? 0;
  const reps = ex.reps ?? ex.duration ?? 0;
  return `${ex.name} - ${sets} x ${reps}`;
}

export default function WorkoutScreen() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [openDay, setOpenDay] = useState<string>(DAY_ORDER[0]);
  const weeklyPlan = profile?.workoutPlan?.weeklyWorkoutPlan;

  if (!weeklyPlan) return <View style={styles.center}><Text style={styles.emptyTitle}>{t('workoutScreen.emptyTitle')}</Text><Text style={styles.emptyText}>{t('workoutScreen.emptyText')}</Text></View>;

  const goalLabel = profile?.goal === 'weight loss' ? t('goals.weightLoss') : profile?.goal === 'muscle gain' ? t('goals.muscleGain') : t('goals.maintenance');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{t('workoutScreen.goal')}: {goalLabel}</Text>
      {DAY_ORDER.map((day) => {
        const dayPlan = weeklyPlan[day] as WorkoutDay | string[] | undefined;
        const filteredPlan = dayPlan ? filterWorkoutDay(dayPlan, profile) : undefined;

        let exercises: string[] = [];
        if (Array.isArray(filteredPlan)) {
          exercises = filteredPlan.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        } else if (filteredPlan?.exercises) {
          exercises = filteredPlan.exercises.filter(Boolean).map(formatExercise);
        }

        const inferredRest = exercises.length > 0 && looksLikeRestLine(exercises[0]);
        const isRest = (!Array.isArray(filteredPlan) && filteredPlan?.type === 'rest') || inferredRest;

        if (!exercises.length && !isRest) return null;

        const isOpen = openDay === day;
        const titleSuffix = isRest ? ` · ${t('workoutScreen.rest')}` : ` · ${exercises.length} ${t('workoutScreen.exercisesShort')}`;

        return (
          <View key={day} style={styles.dayCard}>
            <TouchableOpacity onPress={() => setOpenDay(isOpen ? '' : day)}>
              <Text style={styles.dayTitle}>{t(`days.${day}`)}{titleSuffix}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.list}>
                {isRest && exercises.length === 0 ? (
                  <View style={styles.exerciseRow}><Text style={styles.bullet}>1.</Text><Text style={styles.exerciseText}>{t('workoutScreen.rest')}</Text></View>
                ) : (
                  exercises.map((ex, i) => (
                    <View key={i} style={styles.exerciseRow}><Text style={styles.bullet}>{i + 1}.</Text><Text style={styles.exerciseText}>{ex}</Text></View>
                  ))
                )}
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
  dayCard: { backgroundColor: colors.card, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  dayTitle: { fontSize: 17, fontWeight: '600', padding: 16, color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  exerciseRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  bullet: { fontSize: 15, fontWeight: '700', color: colors.primary, width: 24 },
  exerciseText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
