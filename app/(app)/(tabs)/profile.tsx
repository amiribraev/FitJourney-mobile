import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { generatePlans } from '@/lib/api';
import type { Goal } from '@/lib/types';
import { colors } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut, updateProfileData } = useAuth();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<Goal>('weight loss');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setWeight(String(profile.weight));
      setHeight(String(profile.height));
      setGoal(profile.goal);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile || !user || generating) return;
    if (profile.dietPlan && profile.workoutPlan) return;

    const run = async () => {
      setGenerating(true);
      try {
        const result = await generatePlans({
          age: profile.age,
          gender: profile.gender,
          weight: profile.weight,
          height: profile.height,
          goal: profile.goal,
        });

        const update: Record<string, unknown> = {};
        if (result.dietPlan) update.dietPlan = result.dietPlan;
        if (result.workoutPlan) update.workoutPlan = result.workoutPlan;

        if (Object.keys(update).length > 0) {
          await db.collection('users').doc(user.uid).set(update, { merge: true });
          Alert.alert('Готово', 'Персональные планы сгенерированы');
        }
      } catch (e) {
        Alert.alert(
          'Ошибка генерации',
          e instanceof Error ? e.message : 'Проверьте, что сайт запущен и EXPO_PUBLIC_API_URL указан верно'
        );
      } finally {
        setGenerating(false);
      }
    };

    run();
  }, [profile?.uid, profile?.dietPlan, profile?.workoutPlan, generating]);

  const handleRegenerate = async () => {
    if (!profile || !user) return;
    setGenerating(true);
    try {
      const result = await generatePlans({
        age: profile.age,
        gender: profile.gender,
        weight: parseFloat(weight) || profile.weight,
        height: parseFloat(height) || profile.height,
        goal,
      });
      await db
        .collection('users')
        .doc(user.uid)
        .set(
          {
            weight: parseFloat(weight) || profile.weight,
            height: parseFloat(height) || profile.height,
            goal,
            ...(result.dietPlan && { dietPlan: result.dietPlan }),
            ...(result.workoutPlan && { workoutPlan: result.workoutPlan }),
          },
          { merge: true }
        );
      Alert.alert('Готово', 'Планы обновлены');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить планы');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfileData({
        weight: parseFloat(weight),
        height: parseFloat(height),
        goal,
      });
      Alert.alert('Сохранено', 'Профиль обновлён');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.email}>{profile.email}</Text>
      <Text style={styles.meta}>
        {profile.age} лет · {profile.gender === 'male' ? 'муж' : 'жен'} · {profile.weight} кг · {profile.height} см
      </Text>

      {generating && (
        <View style={styles.banner}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.bannerText}>Генерация планов ИИ… до 1 мин</Text>
        </View>
      )}

      <Text style={styles.label}>Вес (кг)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />

      <Text style={styles.label}>Рост (см)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={height} onChangeText={setHeight} />

      <Text style={styles.label}>Цель</Text>
      <View style={styles.row}>
        <Chip label="Похудение" active={goal === 'weight loss'} onPress={() => setGoal('weight loss')} />
        <Chip label="Набор массы" active={goal === 'muscle gain'} onPress={() => setGoal('muscle gain')} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving || generating}>
        <Text style={styles.buttonText}>Сохранить профиль</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonOutline]}
        onPress={handleRegenerate}
        disabled={generating}
      >
        <Text style={styles.buttonOutlineText}>Пересоздать планы ИИ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: { color: colors.text, flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.card,
  },
  row: { flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  buttonOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  logout: { marginTop: 32, alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: 16 },
});
