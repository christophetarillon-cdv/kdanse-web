import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Season } from '@/types';

const SEASONS_COLLECTION = 'seasons';

// Helper: Convert Firestore timestamps
const convertSeasonData = (data: any): Season => ({
  ...data,
  startDate: data.startDate?.toDate?.() || new Date(data.startDate),
  endDate: data.endDate?.toDate?.() || new Date(data.endDate),
  reservationStartDate: data.reservationStartDate?.toDate?.() || new Date(data.reservationStartDate),
  reservationEndDate: data.reservationEndDate?.toDate?.() || new Date(data.reservationEndDate),
  createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
  updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
});

// Get all seasons
export const getSeasons = async (): Promise<Season[]> => {
  const q = query(collection(db, SEASONS_COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => convertSeasonData({ id: d.id, ...d.data() }));
};

// Get active season
export const getActiveSeason = async (): Promise<Season | null> => {
  const q = query(collection(db, SEASONS_COLLECTION), where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return convertSeasonData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
};

// Get season by ID
export const getSeasonById = async (id: string): Promise<Season | null> => {
  const snapshot = await getDoc(doc(db, SEASONS_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return convertSeasonData({ id: snapshot.id, ...snapshot.data() });
};

// Get season by name
export const getSeasonByName = async (name: string): Promise<Season | null> => {
  const q = query(collection(db, SEASONS_COLLECTION), where('name', '==', name));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return convertSeasonData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
};

// Create season
export const createSeason = async (data: Omit<Season, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, SEASONS_COLLECTION), {
    ...data,
    stageIds: data.stageIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Update season
export const updateSeason = async (id: string, data: Partial<Season>) => {
  const { id: _id, createdAt, ...updateData } = data as any;
  return updateDoc(doc(db, SEASONS_COLLECTION, id), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

// Delete season
export const deleteSeason = async (id: string) => {
  return deleteDoc(doc(db, SEASONS_COLLECTION, id));
};

// Add stage to season
export const addStageToSeason = async (seasonId: string, stageId: string) => {
  const season = await getSeasonById(seasonId);
  if (!season) throw new Error('Season not found');

  const stageIds = season.stageIds || [];
  if (!stageIds.includes(stageId)) {
    stageIds.push(stageId);
    await updateSeason(seasonId, { stageIds });
  }
};

// Remove stage from season
export const removeStageFromSeason = async (seasonId: string, stageId: string) => {
  const season = await getSeasonById(seasonId);
  if (!season) throw new Error('Season not found');

  const stageIds = (season.stageIds || []).filter(id => id !== stageId);
  await updateSeason(seasonId, { stageIds });
};

// Get next season (for reservations)
export const getNextSeason = async (): Promise<Season | null> => {
  try {
    const now = new Date();
    console.log('🔍 getNextSeason: searching for reservation season');

    // Just get seasons with status 'reservation', no orderBy to avoid index requirement
    const q = query(
      collection(db, SEASONS_COLLECTION),
      where('status', '==', 'reservation')
    );
    const snapshot = await getDocs(q);
    console.log('✅ getNextSeason: found', snapshot.docs.length, 'seasons');

    if (snapshot.empty) return null;

    // Find the first season starting in the future, sorted in memory
    const nextSeason = snapshot.docs
      .map(d => convertSeasonData({ id: d.id, ...d.data() }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .find(s => s.startDate > now);

    console.log('✅ getNextSeason: found next season', nextSeason?.name, 'startDate:', nextSeason?.startDate);
    return nextSeason || null;
  } catch (err) {
    console.error('❌ getNextSeason error:', err);
    throw err;
  }
};

// Check if user can reserve for next season (must be registered in current/previous season)
export const canUserReserveForNextSeason = async (userId: string): Promise<boolean> => {
  // This will be implemented in Phase 3 with participation checks
  // For now, return true as placeholder
  return true;
};
