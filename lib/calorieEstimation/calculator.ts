import {
  FoodEstimationInput,
  CalorieEstimationResult,
  FoodResult,
  PlateEstimation,
  DEFAULT_FOCAL_LENGTH_PX,
  DEFAULT_CALIBRATION_CONSTANT,
  FOOD_DENSITY,
  FOOD_CALORIES_PER_GRAM,
} from './types';
import { calculatePolygonArea, pixelsToCm } from './geometry';

export function calculateCmPerPixel(
  cameraDistanceCm: number,
  focalLengthPx: number = DEFAULT_FOCAL_LENGTH_PX,
  calibrationConstant: number = DEFAULT_CALIBRATION_CONSTANT
): number {
  return (cameraDistanceCm * calibrationConstant) / focalLengthPx;
}

export function estimatePlate(
  diameterPx: number,
  cmPerPixel: number
): PlateEstimation {
  const diameterCm = diameterPx * cmPerPixel;
  const areaCm2 = Math.PI * Math.pow(diameterCm / 2, 2);
  
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  if (diameterCm >= 20 && diameterCm <= 30) {
    confidence = 'high';
  } else if (diameterCm >= 15 && diameterCm <= 35) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    diameter_cm: Math.round(diameterCm * 10) / 10,
    area_cm2: Math.round(areaCm2),
    confidence,
  };
}

export function estimateFood(
  areaPx: number,
  foodType: keyof typeof FOOD_DENSITY,
  cmPerPixel: number
): FoodResult {
  const areaCm2 = areaPx * cmPerPixel * cmPerPixel;
  const grams = areaCm2 * FOOD_DENSITY[foodType];
  const calories = grams * FOOD_CALORIES_PER_GRAM[foodType];
  
  return {
    type: foodType,
    area_cm2: Math.round(areaCm2),
    grams: Math.round(grams),
    calories: Math.round(calories),
  };
}

export function calculateErrorMargin(plateConfidence: 'high' | 'medium' | 'low'): string {
  switch (plateConfidence) {
    case 'high':
      return '±20-25%';
    case 'medium':
      return '±25-35%';
    case 'low':
      return '±35-40%';
  }
}

export function estimateCalories(input: FoodEstimationInput): CalorieEstimationResult {
  const { camera, plate, foods } = input;
  
  const cmPerPixel = calculateCmPerPixel(
    camera.distance_cm,
    camera.focal_length_px,
    camera.calibration_constant
  );
  
  const plateEstimation = estimatePlate(plate.diameter_px, cmPerPixel);
  
  const foodResults: FoodResult[] = foods.map(({ annotation, food_type }) => {
    const areaPx = calculatePolygonArea(annotation.points);
    return estimateFood(areaPx, food_type, cmPerPixel);
  });
  
  const totalCalories = foodResults.reduce((sum, food) => sum + food.calories, 0);
  
  return {
    plate_estimation: plateEstimation,
    foods: foodResults,
    total_calories: totalCalories,
    error_margin: calculateErrorMargin(plateEstimation.confidence),
    cm_per_pixel: Math.round(cmPerPixel * 1000) / 1000,
  };
}