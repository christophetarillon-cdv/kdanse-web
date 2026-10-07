import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dance, Level } from '@/types/courses';

const DANCES_COLLECTION = 'dances';
const LEVELS_COLLECTION = 'levels';

// ============= DANCES =============

export const getDances = async (): Promise<Dance[]> => {
  const q = query(collection(db, DANCES_COLLECTION), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
  } as Dance));
};

export const getDance = async (danceId: string): Promise<Dance | null> => {
  const doc_ref = doc(db, DANCES_COLLECTION, danceId);
  const doc_snap = await getDoc(doc_ref);
  if (!doc_snap.exists()) return null;
  return {
    id: doc_snap.id,
    ...doc_snap.data(),
    createdAt: doc_snap.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc_snap.data().updatedAt?.toDate?.() || new Date(),
  } as Dance;
};

export const createDance = async (name: string, order: number): Promise<Dance> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, DANCES_COLLECTION), {
    name,
    order,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: docRef.id,
    name,
    order,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateDance = async (
  danceId: string,
  name: string,
  order: number
): Promise<void> => {
  const docRef = doc(db, DANCES_COLLECTION, danceId);
  await updateDoc(docRef, {
    name,
    order,
    updatedAt: new Date(),
  });
};

export const deleteDance = async (danceId: string): Promise<void> => {
  await deleteDoc(doc(db, DANCES_COLLECTION, danceId));
};

// ============= LEVELS =============

export const getLevels = async (): Promise<Level[]> => {
  const q = query(collection(db, LEVELS_COLLECTION), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
  } as Level));
};

export const getLevel = async (levelId: string): Promise<Level | null> => {
  const doc_ref = doc(db, LEVELS_COLLECTION, levelId);
  const doc_snap = await getDoc(doc_ref);
  if (!doc_snap.exists()) return null;
  return {
    id: doc_snap.id,
    ...doc_snap.data(),
    createdAt: doc_snap.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc_snap.data().updatedAt?.toDate?.() || new Date(),
  } as Level;
};

export const createLevel = async (name: string, order: number): Promise<Level> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, LEVELS_COLLECTION), {
    name,
    order,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: docRef.id,
    name,
    order,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateLevel = async (
  levelId: string,
  name: string,
  order: number
): Promise<void> => {
  const docRef = doc(db, LEVELS_COLLECTION, levelId);
  await updateDoc(docRef, {
    name,
    order,
    updatedAt: new Date(),
  });
};

export const deleteLevel = async (levelId: string): Promise<void> => {
  await deleteDoc(doc(db, LEVELS_COLLECTION, levelId));
};
