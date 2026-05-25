import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { appendCalorieCameraEntry, CALORIE_CAMERA_DAILY_LIMIT, getCameraTransfersCount } from '@/lib/services/progressService';
import type { ProgressLog } from '@/lib/types';
import { FOOD_CALORIES_PER_GRAM, FOOD_DENSITY, FoodType } from '@/lib/calorieEstimation/types';
import { useI18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n/types';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Point = { x: number; y: number };
type FoodAnnotation = { points: Point[]; food_type: FoodType };
type EstimationItem = { type: FoodType; area_cm2: number; grams: number; calories: number };
type EstimationResult = { plate_estimation: { diameter_cm: number; confidence: 'high' | 'medium' | 'low' }; foods: EstimationItem[]; total_calories: number; error_margin: string };

const FOOD_TYPES: FoodType[] = ['rice', 'chicken', 'pasta', 'salad', 'potato', 'beef', 'fish', 'vegetables', 'bread', 'fruit'];
const FOOD_LABELS_I18N: Record<Language, Record<FoodType, string>> = {
  ru: { rice: 'Рис', chicken: 'Курица', pasta: 'Паста', salad: 'Салат', potato: 'Картофель', beef: 'Говядина', fish: 'Рыба', vegetables: 'Овощи', bread: 'Хлеб', fruit: 'Фрукты' },
  kk: { rice: 'Күріш', chicken: 'Тауық еті', pasta: 'Паста', salad: 'Салат', potato: 'Картоп', beef: 'Сиыр еті', fish: 'Балық', vegetables: 'Көкөністер', bread: 'Нан', fruit: 'Жеміс' },
  en: { rice: 'Rice', chicken: 'Chicken', pasta: 'Pasta', salad: 'Salad', potato: 'Potato', beef: 'Beef', fish: 'Fish', vegetables: 'Vegetables', bread: 'Bread', fruit: 'Fruit' },
};
const MIN_DISTANCE_CM = 10;
const MAX_DISTANCE_CM = 50;
const POINT_SIZE = 8;
const TOUCH_SIZE = 32;
const CALORIE_MULTIPLIER = 12;

export default function CalorieCameraScreen() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const foodLabels = FOOD_LABELS_I18N[language];
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'plate' | 'food'>('none');
  const [platePoints, setPlatePoints] = useState<Point[]>([]);
  const [foodPoints, setFoodPoints] = useState<Point[]>([]);
  const [foodAnnotations, setFoodAnnotations] = useState<FoodAnnotation[]>([]);
  const [currentFoodType, setCurrentFoodType] = useState<FoodType>('rice');
  const [distance, setDistance] = useState<number>(30);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const canAddFood = foodPoints.length >= 3;
  const canEstimate = platePoints.length >= 2 && foodAnnotations.length > 0;

  const statusText = useMemo(() => {
    if (mode === 'plate') return t('camera.plateStep');
    if (mode === 'food') return `${t('camera.foodStep')} ${foodLabels[currentFoodType]}`;
    if (!imageUri) return t('camera.takeTopPhoto');
    if (platePoints.length < 2) return t('camera.firstPlate');
    if (foodAnnotations.length === 0) return t('camera.addFoodFirst');
    return t('camera.calcStep');
  }, [mode, currentFoodType, imageUri, platePoints.length, foodAnnotations.length, t, foodLabels]);

  const instructions = useMemo(() => {
    if (!imageUri) return [];
    return [
      t('camera.plateStep'),
      `${t('camera.foodStep')} ${t('camera.food')}`,
      t('camera.addFood'),
      t('camera.calcCalories'),
    ];
  }, [imageUri, t]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('camera.allowCameraTitle'), t('camera.allowCameraText'));
      return;
    }
    const pickerResult = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      resetAnnotations();
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const pickFromGallery = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      resetAnnotations();
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const resetAnnotations = () => {
    setPlatePoints([]);
    setFoodPoints([]);
    setFoodAnnotations([]);
    setMode('none');
    setResult(null);
  };

  const handleImagePress = (event: any) => {
    if (mode === 'none') return;
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    if (mode === 'plate') {
      setPlatePoints(prev => [...prev, point]);
    } else {
      setFoodPoints(prev => [...prev, point]);
    }
  };

  const undoPoint = () => {
    if (mode === 'plate' && platePoints.length > 0) {
      setPlatePoints(prev => prev.slice(0, -1));
    } else if (mode === 'food' && foodPoints.length > 0) {
      setFoodPoints(prev => prev.slice(0, -1));
    }
  };

  const addCurrentFood = () => {
    if (foodPoints.length < 3) {
      Alert.alert(t('camera.needMorePointsTitle'), t('camera.needMorePointsText'));
      return;
    }
    setFoodAnnotations(prev => [...prev, { points: [...foodPoints], food_type: currentFoodType }]);
    setFoodPoints([]);
    setMode('none');
  };

  const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  const calculateMaxDistance = (points: Point[]): number => {
    if (points.length < 2) return 0;
    let max = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > max) max = dist;
      }
    }
    return max;
  };

  const estimate = () => {
    if (platePoints.length < 2) {
      Alert.alert(t('camera.plateMissingTitle'), t('camera.plateMissingText'));
      return;
    }
    if (foodAnnotations.length === 0) {
      Alert.alert(t('camera.foodMissingTitle'), t('camera.foodMissingText'));
      return;
    }

    const diameterPx = calculateMaxDistance(platePoints);
    const cmPerPixel = (distance * 1.3) / 800;
    const diameterCm = diameterPx * cmPerPixel;
    const confidence = diameterCm >= 20 && diameterCm <= 30 ? 'high' : diameterCm >= 15 && diameterCm <= 35 ? 'medium' : 'low';

    const foods = foodAnnotations.map(({ points, food_type }) => {
      const areaPx = calculatePolygonArea(points);
      const areaCm2 = areaPx * cmPerPixel * cmPerPixel;
      const grams = areaCm2 * FOOD_DENSITY[food_type];
      return {
        type: food_type,
        area_cm2: Math.round(areaCm2),
        grams: Math.round(grams),
        calories: Math.round(grams * FOOD_CALORIES_PER_GRAM[food_type] * CALORIE_MULTIPLIER),
      };
    });

    const total = foods.reduce((sum, item) => sum + item.calories, 0);
    setResult({ plate_estimation: { diameter_cm: Math.round(diameterCm * 10) / 10, confidence }, foods, total_calories: total, error_margin: '±20-40%' });
    setModalVisible(true);
  };

  const addToTodayProgress = async () => {
    if (!user || !result) return;
    setAdding(true);
    try {
      const now = new Date();
      const dayId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const snap = await db.collection('users').doc(user.uid).collection('progressLogs').doc(dayId).get();
      const log = snap.exists ? (snap.data() as ProgressLog) : undefined;
      if (getCameraTransfersCount(log) >= CALORIE_CAMERA_DAILY_LIMIT) {
        Alert.alert(t('camera.limitTitle'), t('camera.limitText'));
        return;
      }
      const transfer = await appendCalorieCameraEntry(user.uid, dayId, log, result.total_calories);
      if (!transfer.ok && transfer.reason === 'duplicate') {
        Alert.alert(t('camera.duplicateTitle'), t('camera.duplicateText'));
        return;
      }
      if (!transfer.ok && transfer.reason === 'limit') {
        Alert.alert(t('camera.limitTitle'), t('camera.limitText'));
        return;
      }
      Alert.alert(t('common.done'), t('camera.doneText'));
      setModalVisible(false);
    } finally {
      setAdding(false);
    }
  };

  const renderPointMarker = (point: Point, colorVar: string, key: string, animValue: Animated.Value) => (
    <Animated.View key={key} style={{
      position: 'absolute',
      left: point.x - TOUCH_SIZE / 2,
      top: point.y - TOUCH_SIZE / 2,
      width: TOUCH_SIZE,
      height: TOUCH_SIZE,
      borderRadius: TOUCH_SIZE / 2,
      backgroundColor: colorVar + '20',
      borderWidth: 2,
      borderColor: colorVar,
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ scale: animValue }],
      shadowColor: colorVar,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }}>
      <View style={{ width: POINT_SIZE, height: POINT_SIZE, borderRadius: POINT_SIZE / 2, backgroundColor: colorVar }} />
    </Animated.View>
  );

  const renderFoodChart = (foods: EstimationItem[]) => {
    const total = foods.reduce((sum, f) => sum + f.calories, 0);
    let cumulative = 0;
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('camera.caloriesDistribution')}</Text>
        <View style={styles.barContainer}>
          {foods.map((food, index) => {
            const percentage = (food.calories / total) * 100;
            cumulative += percentage;
            const colors_list = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
            return (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{foodLabels[food.type]}</Text>
                <View style={styles.barBackground}>
                  <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: colors_list[index % colors_list.length] }]} />
                </View>
                <Text style={styles.barValue}>{food.calories} ккал</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (!imageUri) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.background, '#E0F2FE']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.uploadContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{t('camera.title')}</Text>
            <Text style={styles.subtitle}>{t('camera.subtitle')}</Text>
          </View>

          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
            <Text style={styles.uploadText}>{t('camera.takePhoto')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadBtnSecondary} onPress={pickFromGallery} activeOpacity={0.8}>
            <Text style={styles.uploadTextSecondary}>{t('camera.pickGallery')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, '#E0F2FE']} style={StyleSheet.absoluteFillObject} />
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>{t('camera.instruction')}</Text>
          {instructions.map((line, i) => (
            <Text key={i} style={styles.instructionLine}>{line}</Text>
          ))}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          <Text style={styles.progressText}>{t('camera.pointsProgress')}: {platePoints.length} | {t('camera.productsProgress')}: {foodAnnotations.length}</Text>
        </View>

        <View style={styles.imageWrapper}>
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={handleImagePress} activeOpacity={1} style={{ flex: 1 }}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
              {platePoints.map((p, i) => {
                const anim = new Animated.Value(1);
                Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
                return renderPointMarker(p, colors.primary, `plate-${i}`, anim);
              })}
              {foodPoints.map((p, i) => {
                const anim = new Animated.Value(1);
                Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
                return renderPointMarker(p, colors.danger, `food-${i}`, anim);
              })}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlsCard}>
          <TouchableOpacity 
            style={[styles.btn, mode === 'plate' && styles.btnActive]} 
            onPress={() => setMode(mode === 'plate' ? 'none' : 'plate')}
          >
            <Text style={[styles.btnText, mode === 'plate' && styles.btnTextActive]}>{t('camera.plate')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btn, mode === 'food' && styles.btnActive]} 
            onPress={() => setMode(mode === 'food' ? 'none' : 'food')}
          >
            <Text style={[styles.btnText, mode === 'food' && styles.btnTextActive]}>{t('camera.food')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={undoPoint}>
            <Text style={styles.btnText}>{t('camera.undo')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.foodTypeCard}>
          <Text style={styles.sectionLabel}>{t('camera.foodType')}</Text>
          <ScrollView horizontal contentContainerStyle={styles.foodTypeSelector} showsHorizontalScrollIndicator={false}>
            {FOOD_TYPES.map(foodType => (
              <TouchableOpacity 
                key={foodType} 
                style={[styles.foodTypeBtn, currentFoodType === foodType && styles.foodTypeBtnActive]} 
                onPress={() => setCurrentFoodType(foodType)}
              >
                <Text style={[styles.foodTypeText, currentFoodType === foodType && styles.foodTypeTextActive]}>
                  {foodLabels[foodType]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.distanceCard}>
          <Text style={styles.sectionLabel}>{t('camera.distance')}: {distance} см</Text>
          <View style={styles.distanceControls}>
            <TouchableOpacity onPress={() => setDistance(v => Math.max(MIN_DISTANCE_CM, v - 5))} style={styles.distBtnCircle}>
              <Text style={styles.distBtn}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDistance(v => Math.min(MAX_DISTANCE_CM, v + 5))} style={styles.distBtnCircle}>
              <Text style={styles.distBtn}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btn, styles.btnSuccess, !canAddFood && styles.btnDisabled]} 
            onPress={addCurrentFood} 
            disabled={!canAddFood}
          >
            <Text style={styles.btnText}>{t('camera.addFood')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btn, styles.btnPrimary, !canEstimate && styles.btnDisabled]} 
            onPress={estimate} 
            disabled={!canEstimate}
          >
            <Text style={styles.btnText}>{t('camera.calcCalories')}</Text>
          </TouchableOpacity>
        </View>

<TouchableOpacity style={styles.resetBtn} onPress={() => setImageUri(null)}>
          <Text style={styles.resetText}>{t('camera.anotherPhoto')}</Text>
        </TouchableOpacity>
        </ScrollView>
        </Animated.View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('camera.result')}</Text>

            {result && (
              <ScrollView>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{t('camera.plateDiameter')}</Text>
                  <Text style={styles.resultValue}>{result.plate_estimation.diameter_cm} см</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{t('camera.accuracy')}</Text>
                  <Text style={styles.resultValue}>
                    {result.plate_estimation.confidence === 'high' ? t('camera.high') : result.plate_estimation.confidence === 'medium' ? t('camera.medium') : t('camera.low')}
                  </Text>
                </View>
                
                {renderFoodChart(result.foods)}
                
                <View style={styles.totalContainer}>
                  <Text style={styles.totalCalories}>{t('camera.total')} {result.total_calories} ккал</Text>
                </View>
                <Text style={styles.resultHint}>{t('camera.errorMargin')} {result.error_margin}</Text>
                
                {result.foods.map((food, index) => (
                  <View key={`${food.type}-${index}`} style={styles.foodResultRow}>
                    <Text style={styles.foodResult}>{foodLabels[food.type]}</Text>
                    <Text style={styles.foodResultSecondary}>{food.grams} г • {food.calories} ккал</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={addToTodayProgress} disabled={adding}>
              <Text style={styles.modalBtnText}>{adding ? t('camera.adding') : t('camera.addToProgress')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  uploadContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerCard: { 
    backgroundColor: colors.card, 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  uploadBtn: { 
    width: '100%', 
    backgroundColor: colors.primary, 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadBtnSecondary: { 
    width: '100%', 
    backgroundColor: colors.card, 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: colors.border,
  },
  uploadText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  uploadTextSecondary: { color: colors.text, fontSize: 17, fontWeight: '600' },
  editorScroll: { flex: 1 },
  editorScrollContent: { paddingBottom: 20 },
  instructionsCard: { 
    marginHorizontal: 16, 
    marginTop: 8, 
    marginBottom: 4, 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  instructionLine: { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  statusBadge: { backgroundColor: colors.primary + '20', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 8 },
  statusText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  progressText: { color: colors.textMuted, fontSize: 12, marginTop: 12 },
  imageWrapper: { 
    height: 380, 
    marginHorizontal: 12, 
    marginTop: 8, 
    marginBottom: 8,
  },
  imageContainer: { 
    flex: 1, 
    backgroundColor: colors.card, 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  image: { width: '100%', height: '100%' },
  controlsCard: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 8,
  },
  btn: { 
    flex: 1, 
    backgroundColor: colors.card, 
    padding: 14, 
    borderRadius: 14, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: colors.border,
  },
  btnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  btnTextActive: { color: '#fff' },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnSuccess: { backgroundColor: colors.success, borderColor: colors.success },
  btnDisabled: { opacity: 0.5 },
  foodTypeCard: { 
    marginHorizontal: 16, 
    marginTop: 8, 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: colors.border,
  },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 },
  foodTypeSelector: { paddingHorizontal: 4, gap: 8, paddingBottom: 4 },
  foodTypeBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: colors.background, 
    borderWidth: 1, 
    borderColor: colors.border,
  },
  foodTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  foodTypeText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  foodTypeTextActive: { color: '#fff' },
  distanceCard: { 
    marginHorizontal: 16, 
    marginTop: 8, 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 14, color: colors.text },
  distanceControls: { flexDirection: 'row', gap: 12 },
  distBtnCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.primary + '20', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  distBtn: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 0 },
  resetBtn: { marginHorizontal: 16, marginBottom: 16, padding: 14, backgroundColor: colors.card, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  resetText: { color: colors.text, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    backgroundColor: colors.card, 
    borderRadius: 24, 
    padding: 24, 
    width: '92%', 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: colors.text, textAlign: 'center' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { fontSize: 15, color: colors.textMuted },
  resultValue: { fontSize: 15, color: colors.text, fontWeight: '600' },
  chartContainer: { marginTop: 16, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  barContainer: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, color: colors.textMuted, width: 70 },
  barBackground: { flex: 1, height: 20, backgroundColor: colors.border + '40', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 10 },
  barValue: { fontSize: 12, color: colors.text, fontWeight: '600', width: 70, textAlign: 'right' },
  totalContainer: { 
    backgroundColor: colors.primary + '15', 
    borderRadius: 12, 
    padding: 12, 
    alignItems: 'center', 
    marginVertical: 12,
  },
  totalCalories: { fontWeight: '700', fontSize: 20, color: colors.primary },
  resultHint: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 10, textAlign: 'center' },
  foodResultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  foodResult: { fontSize: 14, color: colors.text },
  foodResultSecondary: { fontSize: 14, color: colors.textMuted },
  modalBtn: { marginTop: 14, padding: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
