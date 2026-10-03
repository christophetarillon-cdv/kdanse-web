'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode dev local - bypass auth
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (isLocalDev) {
      // Si l'utilisateur vient de se déconnecter, rester déconnecté
      const justLoggedOut = localStorage.getItem('justLoggedOut');
      if (justLoggedOut) {
        localStorage.removeItem('justLoggedOut');
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
        return;
      }

      // Mode dev: créer un utilisateur admin de test
      const devUser: User = {
        id: 'dev-user-123',
        email: 'dev@localhost',
        displayName: 'Dev Admin',
        roles: ['admin', 'user'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUser(devUser);
      setFirebaseUser({
        uid: 'dev-user-123',
        email: 'dev@localhost',
        displayName: 'Dev Admin',
      } as unknown as FirebaseUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setError(null);

      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || userData.displayName || '',
              roles: userData.roles || ['user'],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            setError('Profil utilisateur non trouvé');
            setUser(null);
          }
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
  }, [isLocalDev]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
