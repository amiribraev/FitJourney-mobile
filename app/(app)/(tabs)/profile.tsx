import { TagInput } from '@/components/forms/TagInput';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { generatePlansWithFallback } from '@/lib/api';
import { findFilterKey, getFilterLabel, type FilterCategory } from '@/lib/filterDictionary';
import { db } from '@/lib/firebase';
import { type ActivityLevel, type DietRestriction, type Equipment, type FitnessLevel, type Goal } from '@/lib/types';
import { LANGUAGE_OPTIONS, useI18n } from '@/lib/i18n';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, sanitizeForFirestore(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export default function ProfileScreen() {
  const { user, profile, signOut, updateProfileData } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<Goal>('weight loss');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [loadRestrictions, setLoadRestrictions] = useState<string[]>([]);
  const [workoutGoals, setWorkoutGoals] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setGoal(profile.goal);
    const normalizeValues = (category: FilterCategory, items: string[]) =>
      items.map((item) => findFilterKey(category, item) ?? item);
    setAllergies(normalizeValues('allergies', Array.isArray(profile.allergies) ? [...profile.allergies] : []));
    setIntolerances(normalizeValues('intolerances', Array.isArray(profile.intolerances) ? [...profile.intolerances] : []));
    setFoodPreferences(normalizeValues('foodPreferences', Array.isArray(profile.foodPreferences) ? [...profile.foodPreferences] : []));
    setInjuries(normalizeValues('injuries', Array.isArray(profile.injuries) ? [...profile.injuries] : []));
    setLoadRestrictions(normalizeValues('loadRestrictions', Array.isArray(profile.loadRestrictions) ? [...profile.loadRestrictions] : []));
    setWorkoutGoals(normalizeValues('workoutGoals', Array.isArray(profile.workoutGoals) ? [...profile.workoutGoals] : []));
  }, [profile]);

  const canGenerate = useMemo(() => !!profile && !!user, [profile, user]);
  const goalLabel = goal === 'weight loss' ? t('goals.weightLoss') : goal === 'muscle gain' ? t('goals.muscleGain') : t('goals.maintenanceForm');
  const genderLabel = profile?.gender === 'male' ? t('genders.male') : t('genders.female');
  const activityLabels: Record<ActivityLevel, string> = {
    sedentary: t('activity.sedentary'),
    light: t('activity.light'),
    moderate: t('activity.moderate'),
    active: t('activity.active'),
    'very-active': t('activity.veryActive'),
  };
  const fitnessLabels: Record<FitnessLevel, string> = {
    beginner: t('fitness.beginner'),
    intermediate: t('fitness.intermediate'),
    advanced: t('fitness.advanced'),
  };
  const equipmentLabels: Record<Equipment, string> = {
    gym: t('equipment.gym'),
    home: t('equipment.home'),
    'no-equipment': t('equipment.noEquipment'),
  };
  const dietLabels: Record<DietRestriction, string> = {
    none: t('dietRestriction.none'),
    vegan: t('dietRestriction.vegan'),
    vegetarian: t('dietRestriction.vegetarian'),
    halal: t('dietRestriction.halal'),
    kosher: t('dietRestriction.kosher'),
    'gluten-free': t('dietRestriction.glutenFree'),
    'lactose-free': t('dietRestriction.lactoseFree'),
  };

  const handleRegenerate = async () => {
    if (!canGenerate || !profile || !user) return;
    setGenerating(true);
    try {
      const result = await generatePlansWithFallback(profile);
      const payload = sanitizeForFirestore({
        ...(result.dietPlan && { dietPlan: result.dietPlan }),
        ...(result.workoutPlan && { workoutPlan: result.workoutPlan }),
      });
      await db.collection('users').doc(user.uid).set(payload, { merge: true });
      Alert.alert(t('common.done'), t('profile.plansUpdated'));
    } catch (e) {
      if (e instanceof Error && e.message === 'PLAN_MOJIBAKE') {
        Alert.alert(t('common.error'), t('profile.invalidGeneratedPlan'));
      } else {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.plansUpdateError'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePlans = useCallback(async () => {
    if (!profile || !user) return;
    if (profile.dietPlan && profile.workoutPlan) return;
    setGenerating(true);
    try {
      const result = await generatePlansWithFallback(profile);
      const payload = sanitizeForFirestore({
        ...(result.dietPlan && { dietPlan: result.dietPlan }),
        ...(result.workoutPlan && { workoutPlan: result.workoutPlan }),
      });
      await db.collection('users').doc(user.uid).set(payload, { merge: true });
    } catch (e) {
      console.error('Generate plans error:', e);
    } finally {
      setGenerating(false);
    }
  }, [profile, user]);

  useEffect(() => {
    handleGeneratePlans();
  }, [handleGeneratePlans]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfileData({ goal, allergies, intolerances, foodPreferences, injuries, loadRestrictions, workoutGoals, language });
      Alert.alert(t('common.save'), t('profile.saved'));
    } catch {
      Alert.alert(t('common.error'), t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (!profile) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.email}>{profile.email}</Text>

      <ProfileCard title={t('profile.mainInfo')}>
        <InfoRow label={t('profile.gender')} value={genderLabel} />
        <InfoRow label={t('profile.age')} value={`${profile.age}`} />
      </ProfileCard>

      <ProfileCard title={t('profile.fitnessData')}>
        <InfoRow label={t('profile.goal')} value={goalLabel} />
        <InfoRow label={t('profile.weight')} value={`${profile.weight} кг`} />
        <InfoRow label={t('profile.height')} value={`${profile.height} см`} />
        <InfoRow label={t('profile.activity')} value={activityLabels[profile.activityLevel]} />
        <InfoRow label={t('profile.level')} value={fitnessLabels[profile.fitnessLevel]} />
        <InfoRow label={t('profile.equipment')} value={equipmentLabels[profile.equipment]} />
      </ProfileCard>

      <ProfileCard title={t('profile.nutrition')}>
        <InfoRow label={t('profile.diet')} value={dietLabels[profile.dietRestriction]} />
        <TagList title={t('profile.allergies')} values={allergies.map((x) => getFilterLabel('allergies', x, language))} emptyLabel={t('common.notSpecified')} />
        <TagList title={t('profile.intolerances')} values={intolerances.map((x) => getFilterLabel('intolerances', x, language))} emptyLabel={t('common.notSpecified')} />
        <TagList title={t('profile.preferences')} values={foodPreferences.map((x) => getFilterLabel('foodPreferences', x, language))} emptyLabel={t('common.notSpecified')} />
      </ProfileCard>

      <ProfileCard title={t('profile.workouts')}>
        <TagList title={t('profile.injuries')} values={injuries.map((x) => getFilterLabel('injuries', x, language))} emptyLabel={t('common.notSpecified')} />
        <TagList title={t('profile.loadRestrictions')} values={loadRestrictions.map((x) => getFilterLabel('loadRestrictions', x, language))} emptyLabel={t('common.notSpecified')} />
        <TagList title={t('profile.workoutGoals')} values={workoutGoals.map((x) => getFilterLabel('workoutGoals', x, language))} emptyLabel={t('common.notSpecified')} />
      </ProfileCard>

      <ProfileCard title={t('profile.interfaceLanguage')}>
        <Text style={styles.infoLabel}>{t('profile.selectLanguage')}</Text>
        <View style={styles.row}>
          {LANGUAGE_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} active={language === option.value} onPress={() => void setLanguage(option.value)} />
          ))}
        </View>
      </ProfileCard>

      <Text style={styles.label}>{t('profile.goal')}</Text>
      <View style={styles.row}>
        <Chip label={t('goals.weightLoss')} active={goal === 'weight loss'} onPress={() => setGoal('weight loss')} />
        <Chip label={t('goals.muscleGain')} active={goal === 'muscle gain'} onPress={() => setGoal('muscle gain')} />
        <Chip label={t('goals.maintenance')} active={goal === 'maintenance'} onPress={() => setGoal('maintenance')} />
      </View>

      <TagInput category="allergies" label={t('profile.allergies')} values={allergies} onChange={setAllergies} />
      <TagInput category="intolerances" label={t('profile.intolerances')} values={intolerances} onChange={setIntolerances} />
      <TagInput category="foodPreferences" label={t('profile.foodPreferences')} values={foodPreferences} onChange={setFoodPreferences} />
      <TagInput category="injuries" label={t('profile.injuries')} values={injuries} onChange={setInjuries} />
      <TagInput category="loadRestrictions" label={t('profile.loadRestrictions')} values={loadRestrictions} onChange={setLoadRestrictions} />
      <TagInput category="workoutGoals" label={t('profile.workoutGoals')} values={workoutGoals} onChange={setWorkoutGoals} />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving || generating}><Text style={styles.buttonText}>{t('profile.saveProfile')}</Text></TouchableOpacity>
      {(profile?.dietPlan?.generatedLanguage && profile.dietPlan.generatedLanguage !== language) || (profile?.workoutPlan?.generatedLanguage && profile.workoutPlan.generatedLanguage !== language) ? (
        <Text style={styles.mismatchText}>{t('profile.planLanguageMismatch')}</Text>
      ) : null}
      <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleRegenerate} disabled={generating}><Text style={styles.buttonOutlineText}>{generating ? t('profile.generating') : t('profile.regeneratePlans')}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.logout} onPress={handleSignOut}><Text style={styles.logoutText}>{t('profile.signOut')}</Text></TouchableOpacity>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>;
}

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function TagList({ title, values, emptyLabel }: { title: string; values: string[]; emptyLabel: string }) {
  const safeValues = Array.isArray(values) ? values : [];
  return (
    <View style={styles.tagListBlock}>
      <Text style={styles.infoLabel}>{title}</Text>
      <View style={styles.row}>
        {safeValues.length ? safeValues.map((item, index) => <View key={`${title}-${item}-${index}`} style={styles.dataTag}><Text style={styles.dataTagText}>{item}</Text></View>) : <Text style={styles.emptyTagText}>{emptyLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  card: { marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 14, color: colors.text, fontWeight: '600' },
  tagListBlock: { marginBottom: 10 },
  dataTag: { backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  dataTagText: { color: '#1E40AF', fontWeight: '600' },
  emptyTagText: { color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  buttonOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  logout: { marginTop: 24, alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: 16 },
  mismatchText: { marginTop: 10, color: colors.danger, fontSize: 13, fontWeight: '600' },
});

