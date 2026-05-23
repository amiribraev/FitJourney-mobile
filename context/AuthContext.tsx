import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import type {
  UserProfile,
  Gender,
  Goal,
  ActivityLevel,
  FitnessLevel,
  Equipment,
  DietRestriction,
  GamificationStats,
} from '@/lib/types';

type AuthContextValue = {
  user: firebase.User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, name?: string) => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    age: number;
    gender: Gender;
    weight: number;
    height: number;
    goal: Goal;
    activityLevel?: ActivityLevel;
    fitnessLevel?: FitnessLevel;
    equipment?: Equipment;
    dietRestriction?: DietRestriction;
    allergies?: string[];
    injuries?: string[];
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateGamification: (data: Partial<GamificationStats>) => Promise<void>;
  refreshProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireCredentialUser(cred: firebase.auth.UserCredential): firebase.User {
  if (!cred.user) {
    throw new Error('Firebase did not return an authenticated user');
  }
  return cred.user;
}

function getAuthErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'Неизвестная ошибка';
  const e = error as { code?: string; message?: string };
  const code = e.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Некорректный формат email';
    case 'auth/user-disabled':
      return 'Аккаунт заблокирован';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Неверный email или пароль';
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован';
    case 'auth/weak-password':
      return 'Пароль должен содержать минимум 6 символов';
    case 'auth/invalid-credential':
      return 'Неверные учётные данные';
    case 'auth/network-request-failed':
      return 'Ошибка сети. Проверьте подключение к интернету';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Попробуйте позже';
    default:
      return e.message ?? 'Неизвестная ошибка';
  }
}

const DEFAULT_GAMIFICATION: GamificationStats = {
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  currentStreak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  totalWorkoutMinutes: 0,
  achievements: [],
};

function getInitialProfile(user: firebase.User, data: any): UserProfile {
  return {
    uid: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? '',
    age: data?.age ?? 0,
    gender: data?.gender ?? 'male',
    weight: data?.weight ?? 0,
    height: data?.height ?? 0,
    goal: data?.goal ?? 'maintenance',
    activityLevel: data?.activityLevel ?? 'moderate',
    fitnessLevel: data?.fitnessLevel ?? 'beginner',
    equipment: data?.equipment ?? 'no-equipment',
    dietRestriction: data?.dietRestriction ?? 'none',
    allergies: data?.allergies ?? [],
    injuries: data?.injuries ?? [],
    tdee: data?.tdee ?? 0,
    macros: data?.macros ?? { protein: 0, fat: 0, carbs: 0 },
    dietPlan: data?.dietPlan,
    workoutPlan: data?.workoutPlan,
    progressLogs: data?.progressLogs ?? [],
    bodyMeasurements: data?.bodyMeasurements ?? [],
    workoutCalendar: data?.workoutCalendar ?? [],
    gamification: data?.gamification ?? DEFAULT_GAMIFICATION,
    createdAt: data?.createdAt ?? new Date().toISOString(),
    updatedAt: data?.updatedAt ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setProfileTick] = useState(0);

  useEffect(() => {
    const unsubAuth = firebase.auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubProfile = firebase.firestore().collection('users').doc(user.uid).onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = snap.data();
          setProfile(getInitialProfile(user, data));
        } else {
          setProfile(getInitialProfile(user, {}));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore profile error:', err);
        setLoading(false);
      }
    );
    return unsubProfile;
  }, [user]);

  const signIn = async (email: string, password: string, name?: string) => {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    if (name && cred.user) {
      await cred.user.updateProfile({ displayName: name });
    }
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    age: number;
    gender: Gender;
    weight: number;
    height: number;
    goal: Goal;
    activityLevel?: ActivityLevel;
    fitnessLevel?: FitnessLevel;
    equipment?: Equipment;
    dietRestriction?: DietRestriction;
    allergies?: string[];
    injuries?: string[];
  }) => {
    const cred = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
    const createdUser = requireCredentialUser(cred);
    await createdUser.updateProfile({ displayName: data.name });

    const now = new Date().toISOString();
    const profileData: Omit<UserProfile, 'dietPlan' | 'workoutPlan'> = {
      uid: createdUser.uid,
      email: data.email,
      name: data.name,
      age: data.age,
      gender: data.gender,
      weight: data.weight,
      height: data.height,
      goal: data.goal,
      activityLevel: data.activityLevel ?? 'moderate',
      fitnessLevel: data.fitnessLevel ?? 'beginner',
      equipment: data.equipment ?? 'no-equipment',
      dietRestriction: data.dietRestriction ?? 'none',
      allergies: data.allergies ?? [],
      injuries: data.injuries ?? [],
      tdee: 0,
      macros: { protein: 0, fat: 0, carbs: 0 },
      progressLogs: [],
      bodyMeasurements: [],
      workoutCalendar: [],
      gamification: DEFAULT_GAMIFICATION,
      createdAt: now,
      updatedAt: now,
    };

    await firebase.firestore().collection('users').doc(createdUser.uid).set(profileData);
  };

  const signOut = async () => { await firebase.auth().signOut(); };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await firebase.firestore().collection('users').doc(user.uid).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateGamification = async (data: Partial<GamificationStats>) => {
    if (!user || !profile) return;
    const updated = { ...profile.gamification, ...data };
    await firebase.firestore().collection('users').doc(user.uid).update({
      gamification: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const refreshProfile = () => setProfileTick((n) => n + 1);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfileData,
        updateGamification,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function signInWithErrorAlert(email: string, password: string) {
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  } catch (e) {
    Alert.alert('Ошибка входа', getAuthErrorMessage(e));
    throw e;
  }
}

export async function signUpWithErrorAlert(data: {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  activityLevel?: ActivityLevel;
  fitnessLevel?: FitnessLevel;
  equipment?: Equipment;
  dietRestriction?: DietRestriction;
  allergies?: string[];
  injuries?: string[];
}) {
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
    const createdUser = requireCredentialUser(cred);
    await createdUser.updateProfile({ displayName: data.name });
    const now = new Date().toISOString();
    const profileData: Omit<UserProfile, 'dietPlan' | 'workoutPlan'> = {
      uid: createdUser.uid,
      email: data.email,
      name: data.name,
      age: data.age,
      gender: data.gender,
      weight: data.weight,
      height: data.height,
      goal: data.goal,
      activityLevel: data.activityLevel ?? 'moderate',
      fitnessLevel: data.fitnessLevel ?? 'beginner',
      equipment: data.equipment ?? 'no-equipment',
      dietRestriction: data.dietRestriction ?? 'none',
      allergies: data.allergies ?? [],
      injuries: data.injuries ?? [],
      tdee: 0,
      macros: { protein: 0, fat: 0, carbs: 0 },
      progressLogs: [],
      bodyMeasurements: [],
      workoutCalendar: [],
      gamification: DEFAULT_GAMIFICATION,
      createdAt: now,
      updatedAt: now,
    };
    await firebase.firestore().collection('users').doc(createdUser.uid).set(profileData);
  } catch (e) {
    Alert.alert('Ошибка регистрации', getAuthErrorMessage(e));
    throw e;
  }
}
