'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setError(null);

      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userRef);

          const userData = userDoc.data() || {};

          // Mise à jour avec données manquantes
          const updatedData = {
            ...userData,
            email: userData.email || fbUser.email || '',
            displayName: userData.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            roles: userData.roles || ['user'],
            createdAt: userData.createdAt || new Date(),
            updatedAt: new Date(),
          };

          // Sauvegarde si données manquantes
          if (!userDoc.exists() || !userData.email || !userData.displayName) {
            await setDoc(userRef, updatedData, { merge: true });
          }

          setUser({
            id: fbUser.uid,
            email: updatedData.email,
            displayName: updatedData.displayName,
            roles: updatedData.roles,
            createdAt: updatedData.createdAt,
            updatedAt: updatedData.updatedAt,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement du profil');
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
