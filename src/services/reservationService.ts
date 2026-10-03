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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Reservation } from '@/types';

const RESERVATIONS_COLLECTION = 'reservations';

const convertReservationData = (data: any): Reservation => ({
  ...data,
  createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
  updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
});

// Get all reservations for a season
export const getReservationsBySeason = async (seasonId: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, RESERVATIONS_COLLECTION),
    where('seasonId', '==', seasonId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => convertReservationData({ id: d.id, ...d.data() }));
};

// Get reservations for a user
export const getReservationsByUser = async (userId: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, RESERVATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => convertReservationData({ id: d.id, ...d.data() }));
};

// Get user's reservation for a specific season
export const getUserReservationForSeason = async (
  userId: string,
  seasonId: string
): Promise<Reservation | null> => {
  const q = query(
    collection(db, RESERVATIONS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const reservation = snapshot.docs.find(doc => doc.data().seasonId === seasonId);
  if (!reservation) return null;
  return convertReservationData({ id: reservation.id, ...reservation.data() });
};

// Create reservation
export const createReservation = async (
  data: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'status'>
) => {
  // Check if user already has a reservation for this season
  const existing = await getUserReservationForSeason(data.userId, data.seasonId);
  if (existing) {
    throw new Error('Vous avez déjà une réservation pour cette saison');
  }

  return addDoc(collection(db, RESERVATIONS_COLLECTION), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Update reservation status
export const updateReservationStatus = async (
  id: string,
  status: Reservation['status']
) => {
  return updateDoc(doc(db, RESERVATIONS_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
};

// Cancel reservation
export const cancelReservation = async (id: string) => {
  return updateReservationStatus(id, 'cancelled');
};

// Delete reservation (admin only)
export const deleteReservation = async (id: string) => {
  return deleteDoc(doc(db, RESERVATIONS_COLLECTION, id));
};

// Get reservation statistics for a season
export const getReservationStats = async (seasonId: string) => {
  const reservations = await getReservationsBySeason(seasonId);

  return {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };
};

// Check if user is eligible for reservation (must be registered in current season)
export const isUserEligibleForReservation = async (
  userId: string,
  currentSeasonId: string
): Promise<boolean> => {
  // This will check if user has an active membership in the current season
  // For now, we'll return true - this will be implemented in Phase 4
  return true;
};
