import { useState, useEffect } from 'react';
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
import { useAuth, signUpWithErrorAlert } from '@/context/AuthContext';
import { colors } from '@/constants/theme';
import type { Gender, Goal } from '@/lib/types';

export default function RegisterScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<Goal>('weight loss');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/(app)/(tabs)/diet');
  }, [user]);

  const handleRegister = async () => {
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!name || !email || !password || !age || !weight || !height) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
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
      });
      router.replace('/(app)/(tabs)/diet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Регистрация</Text>

      <TextInput style={styles.input} placeholder="Имя" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль (мин. 6 символов)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput style={styles.input} placeholder="Возраст" keyboardType="number-pad" value={age} onChangeText={setAge} />
      <TextInput style={styles.input} placeholder="Вес (кг)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
      <TextInput style={styles.input} placeholder="Рост (см)" keyboardType="number-pad" value={height} onChangeText={setHeight} />

      <Text style={styles.label}>Пол</Text>
      <View style={styles.row}>
        <Chip label="Мужской" active={gender === 'male'} onPress={() => setGender('male')} />
        <Chip label="Женский" active={gender === 'female'} onPress={() => setGender('female')} />
      </View>

      <Text style={styles.label}>Цель</Text>
      <View style={styles.row}>
        <Chip label="Похудение" active={goal === 'weight loss'} onPress={() => setGoal('weight loss')} />
        <Chip label="Набор массы" active={goal === 'muscle gain'} onPress={() => setGoal('muscle gain')} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Создать аккаунт</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
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
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.primary },
});
