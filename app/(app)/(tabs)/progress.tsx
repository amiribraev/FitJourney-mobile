import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { ProgressLog } from '@/lib/types';
import { colors } from '@/constants/theme';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CALORIE_TOLERANCE = 300;

function toDayId(date: Date) {
  const d = new Date();
  d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDayId(dayId: string) {
  const [y, m, d] = dayId.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMonthTitle(date: Date) {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function getStatus(calories: number, target: number): 'success' | 'low' | 'high' {
  if (calories < target - CALORIE_TOLERANCE) return 'low';
  if (calories > target + CALORIE_TOLERANCE) return 'high';
  return 'success';
}

function getStatusLabel(status: 'success' | 'low' | 'high') {
  if (status === 'success') return 'Норма выполнена';
  if (status === 'low') return 'Недобор калорий';
  return 'Превышение калорий';
}

function getMotivation(status: 'success' | 'low' | 'high') {
  if (status === 'success') return 'Отличная работа!';
  if (status === 'low') return 'Ты близко к цели!';
  return 'Сегодня перебор, завтра получится лучше!';
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInMonthGrid(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstCell = startOfWeek(start);
  const grid: Date[] = [];
  const totalCells = Math.ceil(((((end.getTime() - firstCell.getTime()) / 86400000) + 1) / 7)) * 7;
  for (let i = 0; i < totalCells; i += 1) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    grid.push(d);
  }
  return grid;
}

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayId = toDayId(today);
  const targetCalories = Math.max(profile?.tdee ?? 0, 1);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [logsMap, setLogsMap] = useState<Record<string, ProgressLog>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(todayId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [calorieInput, setCalorieInput] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!user) return;
    const ref = db.collection('users').doc(user.uid).collection('progressLogs').orderBy('id', 'asc');
    const unsub = ref.onSnapshot((snap) => {
      const next: Record<string, ProgressLog> = {};
      snap.forEach((doc) => {
        const data = doc.data() as ProgressLog;
        next[data.id] = data;
      });
      setLogsMap(next);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fadeAnim, monthCursor]);

  const monthDays = useMemo(() => daysInMonthGrid(monthCursor), [monthCursor]);
  const selectedLog = logsMap[selectedDayId];
  const selectedCalories = selectedLog?.caloriesConsumed ?? 0;
  const selectedStatus = getStatus(selectedCalories, targetCalories);
  const selectedProgress = Math.max(0, Math.min(200, Math.round((selectedCalories / targetCalories) * 100)));

  const recent7Days = useMemo(() => {
    const arr: { dayId: string; calories: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayId = toDayId(d);
      arr.push({ dayId, calories: logsMap[dayId]?.caloriesConsumed ?? 0 });
    }
    return arr;
  }, [logsMap, today]);

  const weekAverage = useMemo(() => {
    const since = new Date(today);
    since.setDate(today.getDate() - 6);
    const values = Object.values(logsMap)
      .filter((log) => parseDayId(log.id) >= since)
      .map((log) => log.caloriesConsumed);
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }, [logsMap, today]);

  const monthAverage = useMemo(() => {
    const values = Object.values(logsMap)
      .filter((log) => {
        const d = parseDayId(log.id);
        return d.getMonth() === monthCursor.getMonth() && d.getFullYear() === monthCursor.getFullYear();
      })
      .map((log) => log.caloriesConsumed);
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }, [logsMap, monthCursor]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const log = logsMap[toDayId(d)];
      if (!log) break;
      if (getStatus(log.caloriesConsumed, targetCalories) !== 'success') break;
      count += 1;
    }
    return count;
  }, [logsMap, today, targetCalories]);

  const openEditorForDay = (dayId: string) => {
    setSelectedDayId(dayId);
    setCalorieInput(logsMap[dayId]?.caloriesConsumed ? String(logsMap[dayId].caloriesConsumed) : '');
    setEditorOpen(true);
  };

  const saveDayCalories = async () => {
    if (!user) return;
    const value = parseInt(calorieInput, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert('Ошибка', 'Введите корректное число калорий');
      return;
    }

    setSaving(true);
    try {
      const ref = db.collection('users').doc(user.uid).collection('progressLogs').doc(selectedDayId);
      const now = new Date().toISOString();
      const logData: ProgressLog = {
        id: selectedDayId,
        userId: user.uid,
        date: parseDayId(selectedDayId).toISOString(),
        caloriesConsumed: value,
        caloriesBurned: logsMap[selectedDayId]?.caloriesBurned ?? 0,
        workoutCompleted: logsMap[selectedDayId]?.workoutCompleted ?? false,
        workoutId: logsMap[selectedDayId]?.workoutId ?? '',
        notes: logsMap[selectedDayId]?.notes ?? '',
        createdAt: logsMap[selectedDayId]?.createdAt ?? now,
      };
      await ref.set(logData, { merge: true });
      setEditorOpen(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    } finally {
      setSaving(false);
    }
  };

  const deleteDayCalories = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await db.collection('users').doc(user.uid).collection('progressLogs').doc(selectedDayId).delete();
      setEditorOpen(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось удалить запись');
    } finally {
      setSaving(false);
    }
  };

  const monthSuccessDays = useMemo(() => {
    return Object.values(logsMap).filter((log) => {
      const d = parseDayId(log.id);
      return d.getMonth() === monthCursor.getMonth() &&
        d.getFullYear() === monthCursor.getFullYear() &&
        getStatus(log.caloriesConsumed, targetCalories) === 'success';
    }).length;
  }, [logsMap, monthCursor, targetCalories]);

  const normalizeBar = (cal: number) => {
    const max = Math.max(targetCalories + CALORIE_TOLERANCE, 1);
    return Math.max(0.1, Math.min(1, cal / max));
  };

  const statusColor = (status: 'success' | 'low' | 'high') => {
    if (status === 'success') return '#16A34A';
    if (status === 'low') return '#F59E0B';
    return '#DC2626';
  };

  const dayCellBackground = (dayId: string, inMonth: boolean) => {
    if (!inMonth) return '#EFF6FF';
    const log = logsMap[dayId];
    if (!log) return colors.card;
    return statusColor(getStatus(log.caloriesConsumed, targetCalories));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Калорийный прогресс</Text>
      <Text style={styles.subtitle}>Цель: {targetCalories} ккал в день</Text>

      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
            <Text style={styles.monthNav}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{getMonthTitle(monthCursor)}</Text>
          <TouchableOpacity onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
            <Text style={styles.monthNav}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekLabels}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekLabel}>{label}</Text>
          ))}
        </View>

        <Animated.View style={[styles.grid, { opacity: fadeAnim }]}> 
          {monthDays.map((d) => {
            const dayId = toDayId(d);
            const inMonth = d.getMonth() === monthCursor.getMonth();
            const isToday = dayId === todayId;
            const hasLog = !!logsMap[dayId];
            return (
              <TouchableOpacity
                key={dayId}
                onPress={() => openEditorForDay(dayId)}
                style={[
                  styles.dayCell,
                  { backgroundColor: dayCellBackground(dayId, inMonth) },
                  isToday && styles.todayCell,
                ]}
              >
                <Text style={[styles.dayCellText, (!inMonth || !hasLog) && styles.dayCellTextMuted]}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Статус дня</Text>
        <Text style={styles.mainValue}>{selectedCalories} ккал</Text>
        <Text style={[styles.statusBadge, { backgroundColor: statusColor(selectedStatus) }]}>{getStatusLabel(selectedStatus)}</Text>
        <Text style={styles.motivation}>{getMotivation(selectedStatus)}</Text>
        <Text style={styles.percent}>Выполнение: {selectedProgress}%</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>Среднее за 7 дней</Text>
          <Text style={styles.metric}>{weekAverage} ккал</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>Среднее за месяц</Text>
          <Text style={styles.metric}>{monthAverage} ккал</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>Серия дней</Text>
          <Text style={styles.metric}>{streak} дн.</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardTitle}>Успешных дней</Text>
          <Text style={styles.metric}>{monthSuccessDays}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>График калорий (7 дней)</Text>
        <View style={styles.chartRow}>
          {recent7Days.map((item) => {
            const status = item.calories ? getStatus(item.calories, targetCalories) : 'low';
            return (
              <View key={item.dayId} style={styles.barWrap}>
                <View style={[styles.bar, { height: `${normalizeBar(item.calories) * 100}%`, backgroundColor: statusColor(status) }]} />
                <Text style={styles.barLabel}>{item.dayId.slice(8)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Калории за {selectedDayId}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Например, 2200"
              value={calorieInput}
              onChangeText={setCalorieInput}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={saveDayCalories} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Сохранить</Text>}
            </TouchableOpacity>
            {!!logsMap[selectedDayId] && (
              <TouchableOpacity style={styles.dangerButton} onPress={deleteDayCalories} disabled={saving}>
                <Text style={styles.buttonText}>Удалить запись</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.ghostButton} onPress={() => setEditorOpen(false)}>
              <Text style={styles.ghostText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfCard: { flex: 1 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  monthNav: { fontSize: 22, fontWeight: '700', color: colors.primary, paddingHorizontal: 8 },
  weekLabels: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  todayCell: { borderWidth: 2, borderColor: '#1D4ED8' },
  dayCellText: { color: '#FFFFFF', fontWeight: '700' },
  dayCellTextMuted: { color: '#334155' },
  cardTitle: { fontSize: 14, color: colors.textMuted, marginBottom: 6, fontWeight: '600' },
  mainValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statusBadge: { color: '#fff', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 8 },
  motivation: { marginTop: 8, color: colors.text, fontWeight: '600' },
  percent: { marginTop: 6, color: colors.textMuted },
  metric: { fontSize: 22, fontWeight: '800', color: colors.text },
  chartRow: { height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', minHeight: 8, borderRadius: 8 },
  barLabel: { marginTop: 4, color: colors.textMuted, fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  dangerButton: { backgroundColor: colors.danger, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  ghostButton: { borderRadius: 12, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
