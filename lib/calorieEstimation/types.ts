export type Point = { x: number; y: number };

export type PlateAnnotation = {
  type: 'circle' | 'polygon';
  center?: Point;
  radius?: number;
  points?: Point[];
  diameter_px: number;
};

export type FoodAnnotation = {
  type: 'polygon';
  points: Point[];
};

export type FoodType = 'rice' | 'chicken' | 'pasta' | 'salad' | 'potato' | 'beef' | 'fish' | 'vegetables' | 'bread' | 'fruit';

export const FOOD_LABELS: Record<FoodType, string> = {
  rice: 'Рис',
  chicken: 'Курица',
  pasta: 'Паста',
  salad: 'Салат',
  potato: 'Картофель',
  beef: 'Говядина',
  fish: 'Рыба',
  vegetables: 'Овощи',
  bread: 'Хлеб',
  fruit: 'Фрукты',
};

export type FoodDensity = Record<FoodType, number>;
export type FoodCaloriesPerGram = Record<FoodType, number>;

export type CameraConfig = {
  distance_cm: number;
  focal_length_px?: number;
  calibration_constant?: number;
};

export type FoodEstimationInput = {
  camera: CameraConfig;
  plate: PlateAnnotation;
  foods: Array<{
    annotation: FoodAnnotation;
    food_type: FoodType;
  }>;
};

export type PlateEstimation = {
  diameter_cm: number;
  area_cm2: number;
  confidence: 'high' | 'medium' | 'low';
};

export type FoodResult = {
  type: FoodType;
  area_cm2: number;
  grams: number;
  calories: number;
};

export type CalorieEstimationResult = {
  plate_estimation: PlateEstimation;
  foods: FoodResult[];
  total_calories: number;
  error_margin: string;
  cm_per_pixel: number;
};

export type PhoneModel = 'iphone' | 'samsung' | 'xiaomi' | 'google' | 'other';

export type PhoneCalibration = {
  model: PhoneModel;
  calibration_constant: number;
  focal_length_px: number;
};

export const DEFAULT_FOCAL_LENGTH_PX = 800;
export const DEFAULT_CALIBRATION_CONSTANT = 1.3;

export const FOOD_DENSITY: FoodDensity = {
  rice: 0.75,
  chicken: 0.80,
  pasta: 0.65,
  salad: 0.20,
  potato: 0.70,
  beef: 0.95,
  fish: 0.85,
  vegetables: 0.15,
  bread: 0.50,
  fruit: 0.30,
};

export const FOOD_CALORIES_PER_GRAM: FoodCaloriesPerGram = {
  rice: 1.3,
  chicken: 1.65,
  pasta: 1.5,
  salad: 0.2,
  potato: 0.77,
  beef: 2.5,
  fish: 1.8,
  vegetables: 0.25,
  bread: 2.7,
  fruit: 0.5,
};

export const PHONE_CALIBRATION: Record<PhoneModel, PhoneCalibration> = {
  iphone: { model: 'iphone', calibration_constant: 1.25, focal_length_px: 820 },
  samsung: { model: 'samsung', calibration_constant: 1.30, focal_length_px: 780 },
  xiaomi: { model: 'xiaomi', calibration_constant: 1.35, focal_length_px: 750 },
  google: { model: 'google', calibration_constant: 1.28, focal_length_px: 800 },
  other: { model: 'other', calibration_constant: 1.30, focal_length_px: 800 },
};

export const PHONE_LABELS: Record<PhoneModel, string> = {
  iphone: 'iPhone',
  samsung: 'Samsung',
  xiaomi: 'Xiaomi',
  google: 'Google Pixel',
  other: 'Другой',
};