import { colors } from '@/constants/theme';
import { FOOD_CALORIES_PER_GRAM, FOOD_DENSITY, FOOD_LABELS, FoodType } from '@/lib/calorieEstimation/types';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Point = { x: number; y: number };
type FoodAnnotation = { points: Point[]; food_type: FoodType };
type EstimationItem = { type: FoodType; area_cm2: number; grams: number; calories: number };
type EstimationResult = { plate_estimation: { diameter_cm: number; confidence: 'high' | 'medium' | 'low' }; foods: EstimationItem[]; total_calories: number; error_margin: string };

const FOOD_TYPES: FoodType[] = ['rice', 'chicken', 'pasta', 'salad', 'potato', 'beef', 'fish', 'vegetables', 'bread', 'fruit'];
const MIN_DISTANCE_CM = 10;
const MAX_DISTANCE_CM = 50;
const POINT_SIZE = 6;
const TOUCH_SIZE = 24;
const CALORIE_MULTIPLIER = 12;

export default function CalorieCameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'plate' | 'food'>('none');
  const [platePoints, setPlatePoints] = useState<Point[]>([]);
  const [foodPoints, setFoodPoints] = useState<Point[]>([]);
  const [foodAnnotations, setFoodAnnotations] = useState<FoodAnnotation[]>([]);
  const [currentFoodType, setCurrentFoodType] = useState<FoodType>('rice');
  const [distance, setDistance] = useState<number>(30);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const canAddFood = foodPoints.length >= 3;
  const canEstimate = platePoints.length >= 2 && foodAnnotations.length > 0;

  const statusText = useMemo(() => {
    if (mode === 'plate') return 'Шаг 1: нажмите на край тарелки несколько раз';
    if (mode === 'food') return `Шаг 2: обведите область для ${FOOD_LABELS[currentFoodType]}`;
    if (!imageUri) return 'Сделайте фото тарелки сверху';
    if (platePoints.length < 2) return 'Сначала выберите режим "Тарелка"';
    if (foodAnnotations.length === 0) return 'Добавьте хотя бы один продукт';
    return 'Шаг 3: нажмите "Рассчитать калории"';
  }, [mode, currentFoodType, imageUri, platePoints.length, foodAnnotations.length]);

  const instructions = useMemo(() => {
    if (!imageUri) return [];
    return [
      '1. Выберите "Тарелка" и нажмите на край тарелки 3-5 раз',
      '2. Выберите тип еды и обведите на картинке её контур',
      '3. Нажмите "Добавить еду", повторите для других продуктов',
      '4. Укажите расстояние до тарелки (см) и нажмите "Рассчитать"',
    ];
  }, [imageUri]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Разрешите камеру', 'Приложение нужно доступ к камере для фото.');
      return;
    }
    const pickerResult = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      resetAnnotations();
    }
  };

  const pickFromGallery = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.8 });
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      resetAnnotations();
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
      Alert.alert('Нужно больше точек', 'Область еды должна иметь минимум 3 точки.');
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
      Alert.alert('Тарелка не обведена', 'Добавьте минимум 2 точки на тарелку.');
      return;
    }
    if (foodAnnotations.length === 0) {
      Alert.alert('Еда не добавлена', 'Добавьте хотя бы один продукт.');
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

  const renderPointMarker = (point: Point, colorVar: string) => (
    <View key={`${point.x}-${point.y}`} style={{
      position: 'absolute',
      left: point.x - TOUCH_SIZE / 2,
      top: point.y - TOUCH_SIZE / 2,
      width: TOUCH_SIZE,
      height: TOUCH_SIZE,
      borderRadius: TOUCH_SIZE / 2,
      backgroundColor: colorVar + '30',
      borderWidth: 2,
      borderColor: colorVar,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{ width: POINT_SIZE, height: POINT_SIZE, borderRadius: POINT_SIZE / 2, backgroundColor: colorVar }} />
    </View>
  );

  return (
    <View style={styles.container}>
      {!imageUri ? (
        <View style={styles.uploadContainer}>
          <Text style={styles.title}>Калории по фото</Text>
          <Text style={styles.subtitle}>Сделайте фото тарелки сверху (расстояние ~30 см). Чем больше угол, тем точнее результат.</Text>

          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Text style={styles.uploadText}>Сделать фото</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadBtnSecondary} onPress={pickFromGallery}>
            <Text style={styles.uploadText}>Выбрать из галереи</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Инструкция</Text>
            {instructions.map((line, i) => (
              <Text key={i} style={styles.instructionLine}>{line}</Text>
            ))}
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.progressText}>Тарелка: {platePoints.length} точек | Продукты: {foodAnnotations.length}</Text>
          </View>

          <View style={styles.imageWrapper}>
            <TouchableOpacity style={styles.imageContainer} onPress={handleImagePress} activeOpacity={1}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
              {platePoints.map((p, i) => renderPointMarker(p, colors.primary))}
              {foodPoints.map((p, i) => renderPointMarker(p, colors.danger))}
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={[styles.btn, mode === 'plate' && styles.btnActive]} onPress={() => setMode(mode === 'plate' ? 'none' : 'plate')}>
              <Text style={styles.btnText}>Тарелка</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, mode === 'food' && styles.btnActive]} onPress={() => setMode(mode === 'food' ? 'none' : 'food')}>
              <Text style={styles.btnText}>Еда</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={undoPoint}>
              <Text style={styles.btnText}>Отменить</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal contentContainerStyle={styles.foodTypeSelector} showsHorizontalScrollIndicator={false}>
            {FOOD_TYPES.map(foodType => (
              <TouchableOpacity key={foodType} style={[styles.foodTypeBtn, currentFoodType === foodType && styles.foodTypeBtnActive]} onPress={() => setCurrentFoodType(foodType)}>
                <Text style={[styles.foodTypeText, currentFoodType === foodType && styles.foodTypeTextActive]}>{FOOD_LABELS[foodType]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.distanceRow}>
            <Text style={styles.label}>Расстояние до тарелки: {distance} см</Text>
            <View style={styles.distanceControls}>
              <TouchableOpacity onPress={() => setDistance(v => Math.max(MIN_DISTANCE_CM, v - 5))}><Text style={styles.distBtn}>-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setDistance(v => Math.min(MAX_DISTANCE_CM, v + 5))}><Text style={styles.distBtn}>+</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnSuccess, !canAddFood && styles.btnDisabled]} onPress={addCurrentFood} disabled={!canAddFood}>
              <Text style={styles.btnText}>Добавить еду</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.btnPrimary, !canEstimate && styles.btnDisabled]} onPress={estimate} disabled={!canEstimate}>
              <Text style={styles.btnText}>Рассчитать калории</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={() => setImageUri(null)}>
            <Text style={styles.resetText}>Другое фото</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Результат</Text>

            {result && (
              <ScrollView>
                <Text style={styles.resultText}>Диаметр тарелки: {result.plate_estimation.diameter_cm} см</Text>
                <Text style={styles.resultText}>{result.plate_estimation.confidence === 'high' ? 'Точность: высокая' : result.plate_estimation.confidence === 'medium' ? 'Точность: средняя' : 'Точность: низкая'}</Text>
                <Text style={[styles.resultText, styles.totalCalories]}>Итого: {result.total_calories} ккал</Text>
                <Text style={styles.resultHint}>Оценка c погрешностью: {result.error_margin}</Text>
                {result.foods.map((food, index) => (
                  <Text key={`${food.type}-${index}`} style={styles.foodResult}>{FOOD_LABELS[food.type]}: {food.grams} г, {food.calories} ккал</Text>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
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
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  uploadBtn: { width: '100%', backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  uploadBtnSecondary: { width: '100%', backgroundColor: colors.card, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  uploadText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editorScroll: { flex: 1 },
  editorScrollContent: { paddingBottom: 20 },
  instructionsCard: { marginHorizontal: 12, marginTop: 8, marginBottom: 4, backgroundColor: colors.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  instructionsTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  instructionLine: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  statusText: { color: colors.primary, fontSize: 13, fontWeight: '500', marginTop: 8 },
  progressText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
imageWrapper: {
  height: 400,
  marginHorizontal: 8,
  marginTop: 2,
  marginBottom: 4,
},
  imageContainer: { flex: 1, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  controls: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  btn: { flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnSuccess: { backgroundColor: colors.success, borderColor: colors.success },
  btnDisabled: { opacity: 0.5 },
  foodTypeSelector: { paddingHorizontal: 16, gap: 6, paddingBottom: 6 },
  foodTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  foodTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  foodTypeText: { fontSize: 12, color: colors.text },
  foodTypeTextActive: { color: '#fff' },
  distanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  label: { fontSize: 14, color: colors.text },
  distanceControls: { flexDirection: 'row', gap: 10 },
  distBtn: { fontSize: 22, color: colors.primary, paddingHorizontal: 8 },
  actions: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 0 },
  resetBtn: { marginHorizontal: 16, marginBottom: 16, padding: 12, backgroundColor: colors.card, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  resetText: { color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '90%', maxHeight: '75%' },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 14, color: colors.text },
  resultText: { fontSize: 16, marginBottom: 6, color: colors.text },
  totalCalories: { fontWeight: '700', marginTop: 4 },
  resultHint: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 10 },
  foodResult: { fontSize: 14, color: colors.text, marginBottom: 6 },
  modalBtn: { marginTop: 14, padding: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
