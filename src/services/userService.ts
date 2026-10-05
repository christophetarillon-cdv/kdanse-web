import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

const USERS_COLLECTION = 'users';

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      profile: {
        ...data.profile,
        dateOfBirth: data.profile?.dateOfBirth?.toDate?.() || data.profile?.dateOfBirth,
      },
    } as User;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    const { id, createdAt, updatedAt, ...cleanUpdates } = updates as any;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(cleanUpdates).filter(([, v]) => v !== undefined)
    );

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
