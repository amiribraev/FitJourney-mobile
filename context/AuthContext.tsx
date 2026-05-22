import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import type { UserProfile, Gender, Goal } from '@/lib/types';

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
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (data: Partial<Pick<UserProfile, 'weight' | 'height' | 'goal'>>) => Promise<void>;
  refreshProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

function requireCredentialUser(cred: firebase.auth.UserCredential): firebase.User {
  if (!cred.user) {
    throw new Error('Firebase did not return an authenticated user');
  }
  return cred.user;
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
        setProfile(snap.exists ? (snap.data() as UserProfile) : null);
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
  }) => {
    const cred = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
    const createdUser = requireCredentialUser(cred);
    await createdUser.updateProfile({ displayName: data.name });
    const profileData: Omit<UserProfile, 'dietPlan' | 'workoutPlan'> = {
      uid: createdUser.uid, email: data.email, name: data.name,
      age: data.age, gender: data.gender, weight: data.weight, height: data.height,
      goal: data.goal, createdAt: new Date().toISOString(),
    };
    await firebase.firestore().collection('users').doc(createdUser.uid).set(profileData);
  };

  const signOut = async () => {
    await firebase.auth().signOut();
  };

  const updateProfileData = async (data: Partial<Pick<UserProfile, 'weight' | 'height' | 'goal'>>) => {
    if (!user) return;
    await firebase.firestore().collection('users').doc(user.uid).update(data);
  };

  const refreshProfile = () => setProfileTick((n) => n + 1);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, updateProfileData, refreshProfile }}>
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
}) {
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
    const createdUser = requireCredentialUser(cred);
    await createdUser.updateProfile({ displayName: data.name });
    const profileData: Omit<UserProfile, 'dietPlan' | 'workoutPlan'> = {
      uid: createdUser.uid, email: data.email, name: data.name,
      age: data.age, gender: data.gender, weight: data.weight, height: data.height,
      goal: data.goal, createdAt: new Date().toISOString(),
    };
    await firebase.firestore().collection('users').doc(createdUser.uid).set(profileData);
  } catch (e) {
    Alert.alert('Ошибка регистрации', getAuthErrorMessage(e));
    throw e;
  }
}
