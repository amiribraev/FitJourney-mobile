import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth, signUpWithErrorAlert } from '@/context/AuthContext';
import { colors } from '@/constants/theme';
import type { Gender, Goal, ActivityLevel, FitnessLevel, Equipment, DietRestriction } from '@/lib/types';
import { TagInput } from '@/components/forms/TagInput';
import { LANGUAGE_OPTIONS, useI18n } from '@/lib/i18n';

export default function RegisterScreen() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<Goal>('weight loss');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
  const [equipment, setEquipment] = useState<Equipment>('no-equipment');
  const [dietRestriction, setDietRestriction] = useState<DietRestriction>('none');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [loadRestrictions, setLoadRestrictions] = useState<string[]>([]);
  const [workoutGoals, setWorkoutGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (user) router.replace('/(app)/(tabs)/diet');
  }, [user]);

  const handleRegister = async () => {
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (!name || !email || !password || !age || !weight || !height) {
      Alert.alert(t('common.error'), t('auth.fillRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordShort'));
      return;
    }
    setLoading(true);
    try {
      await signUpWithErrorAlert({
        name,
        email: email.trim(),
        password,
        age: ageNum,
        gender,
        weight: weightNum,
        height: heightNum,
        goal,
        activityLevel,
        fitnessLevel,
        equipment,
        dietRestriction,
        allergies,
        intolerances,
        foodPreferences,
        injuries,
        loadRestrictions,
        workoutGoals,
        language,
      });
      router.replace('/(app)/(tabs)/diet');
    } finally {
      setLoading(false);
    }
  };

  const goalLabel = (g: Goal) => g === 'weight loss' ? t('goals.weightLoss') : g === 'muscle gain' ? t('goals.muscleGain') : t('goals.maintenance');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('auth.register')}</Text>

            <Text style={styles.label}>{t('profile.interfaceLanguage')}</Text>
            <View style={styles.rowWrap}>
              {LANGUAGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  active={language === option.value}
                  onPress={() => void setLanguage(option.value)}
                />
              ))}
            </View>

            <TextInput style={styles.input} placeholder={t('auth.name')} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder={t('auth.passwordHint')} secureTextEntry value={password} onChangeText={setPassword} />

            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder={t('profile.age')} keyboardType="number-pad" value={age} onChangeText={setAge} />
              <TextInput style={[styles.input, styles.halfInput]} placeholder={`${t('profile.weight')} (РєРі)`} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
            </View>
            <TextInput style={styles.input} placeholder={`${t('profile.height')} (СЃРј)`} keyboardType="number-pad" value={height} onChangeText={setHeight} />

            <Text style={styles.label}>{t('profile.gender')}</Text>
            <View style={styles.rowWrap}>
              <Chip label={t('genders.male')} active={gender === 'male'} onPress={() => setGender('male')} />
              <Chip label={t('genders.female')} active={gender === 'female'} onPress={() => setGender('female')} />
            </View>

            <Text style={styles.label}>{t('profile.goal')}</Text>
            <View style={styles.rowWrap}>
              <Chip label={t('goals.weightLoss')} active={goal === 'weight loss'} onPress={() => setGoal('weight loss')} />
              <Chip label={t('goals.muscleGain')} active={goal === 'muscle gain'} onPress={() => setGoal('muscle gain')} />
              <Chip label={t('goals.maintenance')} active={goal === 'maintenance'} onPress={() => setGoal('maintenance')} />
            </View>

            <Text style={styles.label}>{t('profile.activity')}</Text>
            <View style={styles.rowWrap}>
              {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
                <Chip key={level} label={activityLabels[level]} active={activityLevel === level} onPress={() => setActivityLevel(level)} />
              ))}
            </View>

            <Text style={styles.label}>{t('profile.level')}</Text>
            <View style={styles.rowWrap}>
              {(Object.keys(fitnessLabels) as FitnessLevel[]).map((level) => (
                <Chip key={level} label={fitnessLabels[level]} active={fitnessLevel === level} onPress={() => setFitnessLevel(level)} />
              ))}
            </View>

            <Text style={styles.label}>{t('profile.equipment')}</Text>
            <View style={styles.rowWrap}>
              {(Object.keys(equipmentLabels) as Equipment[]).map((eq) => (
                <Chip key={eq} label={equipmentLabels[eq]} active={equipment === eq} onPress={() => setEquipment(eq)} />
              ))}
            </View>

            <Text style={styles.label}>{t('profile.diet')}</Text>
            <View style={styles.rowWrap}>
              {(Object.keys(dietLabels) as DietRestriction[]).map((d) => (
                <Chip key={d} label={dietLabels[d]} active={dietRestriction === d} onPress={() => setDietRestriction(d)} />
              ))}
            </View>

            <TagInput category="allergies" label={t('profile.allergies')} values={allergies} onChange={setAllergies} />
            <TagInput category="intolerances" label={t('profile.intolerances')} values={intolerances} onChange={setIntolerances} />
            <TagInput category="foodPreferences" label={t('profile.foodPreferences')} values={foodPreferences} onChange={setFoodPreferences} />
            <TagInput category="injuries" label={t('profile.injuries')} values={injuries} onChange={setInjuries} />
            <TagInput category="loadRestrictions" label={t('profile.loadRestrictions')} multiline values={loadRestrictions} onChange={setLoadRestrictions} />
            <TagInput category="workoutGoals" label={t('profile.workoutGoals')} values={workoutGoals} onChange={setWorkoutGoals} />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.link}>
              <Text style={styles.linkText}>{t('auth.hasAccount')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 48, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 10, fontSize: 16, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  rowWrap: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 14 },
});

