import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { ProgressLog } from '@/lib/types';
import { colors } from '@/constants/theme';

function todayId() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const logId = todayId();
  const [calories, setCalories] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ref = db.collection('users').doc(user.uid).collection('progressLogs').doc(logId);
    const unsub = ref.onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = snap.data() as ProgressLog;
          setCalories(String(data.caloriesConsumed));
        } else {
          setCalories('');
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [user, logId]);

  const handleSave = async () => {
    if (!user) return;
    const value = parseInt(calories, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert('Ошибка', 'Введите корректное число калорий');
      return;
    }

    setSaving(true);
    try {
      const ref = db.collection('users').doc(user.uid).collection('progressLogs').doc(logId);
      const logData: ProgressLog = {
        id: logId,
        userId: user.uid,
        date: new Date().toISOString(),
        caloriesConsumed: value,
      };
      await ref.set(logData, { merge: true });
      Alert.alert('Сохранено', 'Прогресс за сегодня обновлён');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Прогресс за сегодня</Text>
      <Text style={styles.date}>{logId}</Text>

      <Text style={styles.label}>Съедено калорий</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="Например, 1800"
        value={calories}
        onChangeText={setCalories}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Сохранить</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  date: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
