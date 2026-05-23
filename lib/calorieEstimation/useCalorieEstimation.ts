import { useState, useCallback } from 'react';
import { Point, FoodEstimationInput, CalorieEstimationResult, PlateAnnotation, FoodAnnotation, FoodType } from './types';
import { estimateCalories, calculateCmPerPixel } from './calculator';
import { DEFAULT_FOCAL_LENGTH_PX, DEFAULT_CALIBRATION_CONSTANT } from './types';

export type AnnotationMode = 'none' | 'plate' | 'food';

export type UseCalorieEstimationReturn = {
  mode: AnnotationMode;
  setMode: (mode: AnnotationMode) => void;
  platePoints: Point[];
  foodPoints: Point[];
  currentFoodType: FoodType;
  setCurrentFoodType: (type: FoodType) => void;
  addPoint: (point: Point) => void;
  undoPoint: () => void;
  clearAnnotations: () => void;
  getPlateAnnotation: () => PlateAnnotation | null;
  addFoodAnnotation: () => void;
  getFoodAnnotations: () => Array<{ annotation: FoodAnnotation; food_type: FoodType }>;
  estimate: (cameraDistanceCm: number, options?: { focalLengthPx?: number; calibrationConstant?: number }) => CalorieEstimationResult | null;
};

export function useCalorieEstimation(): UseCalorieEstimationReturn {
  const [mode, setMode] = useState<AnnotationMode>('none');
  const [platePoints, setPlatePoints] = useState<Point[]>([]);
  const [foodPoints, setFoodPoints] = useState<Point[]>([]);
  const [foodAnnotations, setFoodAnnotations] = useState<Array<{ annotation: FoodAnnotation; food_type: FoodType }>>([]);
  const [currentFoodType, setCurrentFoodType] = useState<FoodType>('rice');

  const addPoint = useCallback((point: Point) => {
    if (mode === 'plate') {
      setPlatePoints(prev => [...prev, point]);
    } else if (mode === 'food') {
      setFoodPoints(prev => [...prev, point]);
    }
  }, [mode]);

  const undoPoint = useCallback(() => {
    if (mode === 'plate' && platePoints.length > 0) {
      setPlatePoints(prev => prev.slice(0, -1));
    } else if (mode === 'food' && foodPoints.length > 0) {
      setFoodPoints(prev => prev.slice(0, -1));
    }
  }, [mode, platePoints.length, foodPoints.length]);

  const clearAnnotations = useCallback(() => {
    setPlatePoints([]);
    setFoodPoints([]);
    setFoodAnnotations([]);
    setMode('none');
  }, []);

  const getPlateAnnotation = useCallback((): PlateAnnotation | null => {
    if (platePoints.length < 2) return null;
    
    let diameterPx = 0;
    
    for (let i = 0; i < platePoints.length; i++) {
      for (let j = i + 1; j < platePoints.length; j++) {
        const dx = platePoints[i].x - platePoints[j].x;
        const dy = platePoints[i].y - platePoints[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > diameterPx) {
          diameterPx = dist;
        }
      }
    }
    
    return {
      type: 'polygon',
      points: [...platePoints],
      diameter_px: diameterPx,
    };
  }, [platePoints]);

  const addFoodAnnotation = useCallback(() => {
    if (foodPoints.length >= 3) {
      setFoodAnnotations(prev => [
        ...prev,
        {
          annotation: { type: 'polygon', points: [...foodPoints] },
          food_type: currentFoodType,
        },
      ]);
      setFoodPoints([]);
      setMode('none');
    }
  }, [foodPoints, currentFoodType]);

  const getFoodAnnotations = useCallback(() => {
    return [...foodAnnotations];
  }, [foodAnnotations]);

  const estimate = useCallback((
    cameraDistanceCm: number,
    options?: { focalLengthPx?: number; calibrationConstant?: number }
  ): CalorieEstimationResult | null => {
    const plate = getPlateAnnotation();
    if (!plate) return null;
    
    const input: FoodEstimationInput = {
      camera: {
        distance_cm: cameraDistanceCm,
        focal_length_px: options?.focalLengthPx ?? DEFAULT_FOCAL_LENGTH_PX,
        calibration_constant: options?.calibrationConstant ?? DEFAULT_CALIBRATION_CONSTANT,
      },
      plate,
      foods: getFoodAnnotations(),
    };
    
    return estimateCalories(input);
  }, [getPlateAnnotation, getFoodAnnotations]);

  return {
    mode,
    setMode,
    platePoints,
    foodPoints,
    currentFoodType,
    setCurrentFoodType,
    addPoint,
    undoPoint,
    clearAnnotations,
    getPlateAnnotation,
    addFoodAnnotation,
    getFoodAnnotations,
    estimate,
  };
}