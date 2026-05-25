import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { ProgressLog } from '@/lib/types';
import { colors } from '@/constants/theme';
import { saveCaloriesForDay, deleteCaloriesForDay } from '@/lib/services/progressService';
import { useI18n } from '@/lib/i18n';

const { width } = Dimensions.get('window');

function toDayId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  
  return days;
}

function getDayStatus(calories: number, target: number) {
  if (calories === 0) return 'empty';
  const lower = target - 300;
  const upper = target + 300;
  if (calories >= lower && calories <= upper) return 'good';
  if (calories < lower) return 'low';
  return 'high';
}

function getDayColor(status: string) {
  switch (status) {
    case 'good': return '#10B981';
    case 'low': return '#F59E0B';
    case 'high': return '#EF4444';
    default: return colors.border;
  }
}

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const { t, language } = useI18n();
  const today = new Date();
  const todayId = toDayId(today);
  
  const [logsMap, setLogsMap] = useState<Record<string, ProgressLog>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDayId, setSelectedDayId] = useState(todayId);
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [mode, setMode] = useState<'total' | 'split'>('total');
  const [totalCalories, setTotalCalories] = useState('');
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');

  const targetCalories = profile?.tdee || 2200;

   useEffect(() => {
     if (!user) return;
     return db.collection('users').doc(user.uid).collection('progressLogs')
       .where('isHidden', '==', false)
       .onSnapshot((snap) => {
         const next: Record<string, ProgressLog> = {};
         snap.forEach((doc) => {
           const data = doc.data() as ProgressLog;
           next[data.id] = data;
         });
         setLogsMap(next);
         setLoading(false);
       }, () => setLoading(false));
   }, [user]);

  const days = useMemo(() => getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);

  const selectedLog = logsMap[selectedDayId];
  const mealsSum = (parseInt(breakfast || '0', 10) || 0) + (parseInt(lunch || '0', 10) || 0) + (parseInt(dinner || '0', 10) || 0);

   const weekAgo = new Date();
   weekAgo.setDate(weekAgo.getDate() - 7);
   const weekLogs = Object.values(logsMap)
     .filter(log => new Date(log.date) >= weekAgo && !log.isHidden);
   const avgWeek = weekLogs.length > 0 ? Math.round(weekLogs.reduce((s, l) => s + l.caloriesConsumed, 0) / weekLogs.length) : 0;

   const monthAgo = new Date();
   monthAgo.setMonth(monthAgo.getMonth() - 1);
   const monthLogs = Object.values(logsMap)
     .filter(log => new Date(log.date) >= monthAgo && !log.isHidden);
   const avgMonth = monthLogs.length > 0 ? Math.round(monthLogs.reduce((s, l) => s + l.caloriesConsumed, 0) / monthLogs.length) : 0;

   const streak = useMemo(() => {
     let count = 0;
     const checkDate = new Date(today);
     while (true) {
       const dayId = toDayId(checkDate);
       const log = logsMap[dayId];
       if (log && !log.isHidden && getDayStatus(log.caloriesConsumed, targetCalories) === 'good') {
         count++;
         checkDate.setDate(checkDate.getDate() - 1);
       } else {
         break;
       }
     }
     return count;
   }, [logsMap, targetCalories]);

   const weekChartData = Array.from({ length: 7 }, (_, i) => {
     const d = new Date();
     d.setDate(d.getDate() - 6 + i);
     const dayId = toDayId(d);
     const log = logsMap[dayId];
     return log && !log.isHidden ? log?.caloriesConsumed ?? 0 : 0;
   });

  const openEditorForDay = (date: Date) => {
    const dayId = toDayId(date);
    const log = logsMap[dayId];
    setSelectedDayId(dayId);
    setMode(log?.calorieInputMode ?? 'total');
    setTotalCalories(log?.totalCalories ? String(log.totalCalories) : '');
    setBreakfast(log?.breakfastCalories ? String(log.breakfastCalories) : '');
    setLunch(log?.lunchCalories ? String(log.lunchCalories) : '');
    setDinner(log?.dinnerCalories ? String(log.dinnerCalories) : '');
    setEditorOpen(true);
  };

  const saveDayCalories = async () => {
    if (!user) {
      Alert.alert(t('common.error'), t('progress.unauthorized'));
      return;
    }
    console.log('Saving for user:', user.uid, 'dayId:', selectedDayId, 'mode:', mode);
    setSaving(true);
    try {
      await saveCaloriesForDay(logsMap[selectedDayId], {
        uid: user.uid,
        dayId: selectedDayId,
        calorieInputMode: mode,
        totalCalories: mode === 'total' ? parseInt(totalCalories || '0', 10) || 0 : undefined,
        breakfastCalories: mode === 'split' ? parseInt(breakfast || '0', 10) || 0 : undefined,
        lunchCalories: mode === 'split' ? parseInt(lunch || '0', 10) || 0 : undefined,
        dinnerCalories: mode === 'split' ? parseInt(dinner || '0', 10) || 0 : undefined,
      });
      setEditorOpen(false);
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert(t('common.error'), `${t('progress.saveError')}: ${e instanceof Error ? e.message : t('common.error')}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteDayLog = async () => {
    if (!user || !selectedLog) return;
    Alert.alert(t('progress.deleteConfirmTitle'), t('progress.deleteConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('progress.delete'),
        style: 'destructive',
onPress: async () => {
           try {
             await deleteCaloriesForDay(user.uid, selectedDayId);
             setEditorOpen(false);
           } catch (e) {
             console.error('Delete error:', e);
             Alert.alert(t('common.error'), `${t('progress.deleteError')}: ${e instanceof Error ? e.message : t('common.error')}`);
           }
         }
      }
    ]);
  };

  const todayLog = logsMap[todayId];
  const todayStatus = getDayStatus(todayLog?.caloriesConsumed ?? 0, targetCalories);
  const todayPercent = Math.min(100, Math.round(((todayLog?.caloriesConsumed ?? 0) / targetCalories) * 100));

  const getMotivation = () => {
    if (todayPercent >= 90 && todayPercent <= 110) return 'Отличная работа!';
    if (todayPercent >= 70 && todayPercent < 90) return 'Ты близко к цели!';
    if (todayPercent > 110) return 'Сегодня перебор, завтра получится лучше!';
    if (todayPercent > 0) return 'Продолжай в том же духе!';
    return 'Начни день с правильного питания!';
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{t('progress.title')}</Text>
        <Text style={styles.motivation}>{getMotivation()}</Text>
      </View>

      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>{t('progress.today')}</Text>
          <View style={[styles.statusDot, { backgroundColor: getDayColor(todayStatus) }]} />
        </View>
        <Text style={styles.todayCalories}>{todayLog?.caloriesConsumed ?? 0} ккал</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${todayPercent}%`, backgroundColor: getDayColor(todayStatus) }]} />
        </View>
        <Text style={styles.todayPercent}>{todayPercent}% от нормы ({targetCalories} ккал)</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditorForDay(today)}>
          <Text style={styles.editButtonText}>{t('progress.edit')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
            <Text style={styles.navButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleDateString(language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
            <Text style={styles.navButton}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10B981' }]} /><Text style={styles.legendText}>Отлично</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>Недобор</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Перебор</Text></View>
        </View>

        <View style={styles.weekDays}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <Text key={d} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((date, i) => {
            if (!date) return <View key={i} style={{ width: (width - 64) / 7 - 4, aspectRatio: 1 }} />;
            const dayId = toDayId(date);
            const log = logsMap[dayId];
            const status = getDayStatus(log?.caloriesConsumed ?? 0, targetCalories);
            const isToday = toDayId(date) === todayId;
            
            const statusColors: Record<string, { bg: string; border: string }> = {
              good: { bg: '#DCFCE7', border: '#10B981' },
              low: { bg: '#FEF3C7', border: '#F59E0B' },
              high: { bg: '#FEE2E2', border: '#EF4444' },
              empty: { bg: '#FFFFFF', border: '#E2E8F0' }
            };
            
            const statusStyle = statusColors[status] || statusColors.empty;
            
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.calendarDayModern,
                  { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                  isToday && { borderWidth: 2, borderColor: colors.primary }
                ]}
                onPress={() => openEditorForDay(date)}
              >
                <Text style={[
                  styles.calendarDayTextModern,
                  { color: status === 'empty' ? colors.textMuted : colors.text },
                  isToday && { color: colors.primary, fontWeight: '700' }
                ]}>
                  {date.getDate()}
                </Text>
                {log && (
                  <View style={styles.calendarStatusIcon}>
                    <Text style={styles.statusIcon}>
                      {status === 'good' ? '✓' : status === 'low' ? '↓' : '↑'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>{t('progress.stats')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgWeek} ккал</Text>
            <Text style={styles.statLabel}>{t('progress.weekAvg')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgMonth} ккал</Text>
            <Text style={styles.statLabel}>{t('progress.monthAvg')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak} дней</Text>
            <Text style={styles.statLabel}>{t('progress.streak')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{t('progress.weekChart')}</Text>
        <View style={styles.chart}>
          {weekChartData.map((calories, i) => {
            const max = Math.max(...weekChartData, targetCalories);
            const height = max > 0 ? Math.round((calories / max) * 100) : 0;
            const isToday = i === 6;
            return (
              <View key={i} style={styles.chartBarContainer}>
                <View style={[styles.chartBar, { height: `${height}%` as any, backgroundColor: isToday ? colors.primary : '#60A5FA' }]} />
                <Text style={styles.chartBarLabel}>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('progress.caloriesForDay')} {selectedDayId}</Text>
            <Text style={styles.help}>{t('progress.selectMode')}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.modeChip, mode === 'total' && styles.modeChipActive]} onPress={() => setMode('total')}>
                <Text style={mode === 'total' ? styles.modeChipTextActive : undefined}>{t('progress.totalCalories')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeChip, mode === 'split' && styles.modeChipActive]} onPress={() => setMode('split')}>
                <Text style={mode === 'split' ? styles.modeChipTextActive : undefined}>{t('progress.byMeals')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, mode === 'split' && styles.inputDisabled]}
              editable={mode === 'total'}
              keyboardType="number-pad"
              placeholder={`Целевая норма: ${targetCalories} ккал`}
              value={totalCalories}
              onChangeText={setTotalCalories}
            />
            <TextInput
              style={[styles.input, mode === 'total' && styles.inputDisabled]}
              editable={mode === 'split'}
              keyboardType="number-pad"
              placeholder={t('progress.breakfast')}
              value={breakfast}
              onChangeText={setBreakfast}
            />
            <TextInput
              style={[styles.input, mode === 'total' && styles.inputDisabled]}
              editable={mode === 'split'}
              keyboardType="number-pad"
              placeholder={t('progress.lunch')}
              value={lunch}
              onChangeText={setLunch}
            />
            <TextInput
              style={[styles.input, mode === 'total' && styles.inputDisabled]}
              editable={mode === 'split'}
              keyboardType="number-pad"
              placeholder={t('progress.dinner')}
              value={dinner}
              onChangeText={setDinner}
            />
            <Text style={styles.help}>{t('progress.dayTotal')}: {mode === 'total' ? (parseInt(totalCalories || '0', 10) || 0) : mealsSum} ккал</Text>

             <View style={styles.modalButtons}>
               {selectedLog && (
                 <TouchableOpacity style={styles.deleteButton} onPress={deleteDayLog}>
                   <Text style={styles.deleteButtonText}>{t('progress.delete')}</Text>
                 </TouchableOpacity>
               )}
               <TouchableOpacity style={styles.primaryButton} onPress={saveDayCalories} disabled={saving}>
                 {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
               </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  motivation: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  
  todayCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  todayCalories: { fontSize: 36, fontWeight: '800', color: colors.text, marginTop: 8 },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  todayPercent: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  editButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  editButtonText: { color: '#fff', fontWeight: '600' },
  
  calendarCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navButton: { fontSize: 24, color: colors.primary, padding: 4, fontWeight: '600' },
  monthTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  calendarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12, paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted },
  weekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDayText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calendarDayModern: { 
    width: (width - 64) / 7 - 4, 
    aspectRatio: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  calendarDayTextModern: { fontSize: 15, fontWeight: '500' },
  calendarStatusIcon: { position: 'absolute', top: 4, right: 4 },
  statusIcon: { fontSize: 10 },
  
  statsCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  statsTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  
  chartCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  chartBarContainer: { alignItems: 'center' },
  chartBar: { width: 24, backgroundColor: '#60A5FA', borderRadius: 4 },
  chartBarLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  help: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: { borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 12, backgroundColor: colors.card },
  modeChipActive: { borderColor: colors.primary, backgroundColor: '#DBEAFE' },
  modeChipTextActive: { color: colors.primary, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  inputDisabled: { backgroundColor: '#E2E8F0', color: colors.textMuted },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteButton: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, alignItems: 'center' },
  deleteButtonText: { color: '#DC2626', fontWeight: '600' },
  primaryButton: { flex: 2, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
