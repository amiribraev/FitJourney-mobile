import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PhoneModel, PhoneCalibration, PHONE_CALIBRATION, DEFAULT_FOCAL_LENGTH_PX, DEFAULT_CALIBRATION_CONSTANT } from './types';

const STORAGE_KEY = 'calorie_estimation_calibration';

export function useCalibration() {
  const [phoneModel, setPhoneModel] = useState<PhoneModel>('other');
  const [calibration, setCalibration] = useState<PhoneCalibration>({
    model: 'other',
    calibration_constant: DEFAULT_CALIBRATION_CONSTANT,
    focal_length_px: DEFAULT_FOCAL_LENGTH_PX,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalibration();
  }, []);

  const loadCalibration = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPhoneModel(parsed.model || 'other');
        setCalibration({
          model: parsed.model || 'other',
          calibration_constant: parsed.calibration_constant || DEFAULT_CALIBRATION_CONSTANT,
          focal_length_px: parsed.focal_length_px || DEFAULT_FOCAL_LENGTH_PX,
        });
      } else {
        setCalibration(PHONE_CALIBRATION.other);
      }
    } catch (e) {
      console.error('Failed to load calibration:', e);
      setCalibration(PHONE_CALIBRATION.other);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCalibration = async (model: PhoneModel, customConstant?: number, customFocal?: number) => {
    const newCalibration: PhoneCalibration = {
      model,
      calibration_constant: customConstant ?? PHONE_CALIBRATION[model].calibration_constant,
      focal_length_px: customFocal ?? PHONE_CALIBRATION[model].focal_length_px,
    };
    
    setPhoneModel(model);
    setCalibration(newCalibration);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCalibration));
    } catch (e) {
      console.error('Failed to save calibration:', e);
    }
  };

  const resetCalibration = async () => {
    await saveCalibration('other');
  };

  return {
    phoneModel,
    calibration,
    isLoading,
    saveCalibration,
    resetCalibration,
  };
}